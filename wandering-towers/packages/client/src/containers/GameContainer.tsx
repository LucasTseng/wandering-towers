import { useCallback, useEffect, useMemo, useState } from 'react';
import type { ActionCommand, CardID, GameEvent, MovementCardDefinition, PlayerID, SpaceIndex, SpellID, TowerID, WizardID } from '@wt/shared';
import { RuleError } from '@wt/engine';
import type { ExecuteResult } from '@wt/engine';
import { MovementCardType, TurnPhase, WizardStateType } from '@wt/shared';
import { clockwiseSpace, isWizardVisible, wizardsOfPlayer } from '@wt/engine';
import { useGame } from '../game/useGame';
import { defaultConfig, PLAYER_COLORS } from '../game/config';
import { deriveAllSpaces } from '../game/selectors';
import { getCardTemplate } from '../game/cardHelper';
import { Dice } from '../components/Dice';
import { StageViewport } from '../components/StageViewport';
import { HandPanel } from '../components/HandPanel';
import { PlayerBar } from '../components/PlayerBar';
import { PotionPanel } from '../components/PotionPanel';
import { SpellPanel } from '../components/SpellPanel';
import { LogPanel } from '../components/LogPanel';
import { WinnerPanel } from '../components/WinnerPanel';
import { DebugPanel, isDebugMode } from '../components/DebugPanel';

/** UI 多步交互意图 */
type UIIntent =
  | { type: 'IDLE' }
  // 二选一牌：先选模式（骰子/固定都走这）
  | { type: 'PLAY_CARD_MODE_CHOICE'; cardId: CardID; tmpl: MovementCardDefinition }
  // 骰子牌已选好模式、等待掷骰（未掷，可取消重选）
  | { type: 'PLAY_CARD_DICE'; cardId: CardID; tmpl: MovementCardDefinition; chosenMode: 'WIZARD' | 'TOWER' }
  // 等待点巫师：fixed 牌直接到此（locked=false，可取消）；dice 掷出后到此（locked=true，不可取消）
  | { type: 'PLAY_CARD_WIZARD'; cardId: CardID; moveValue: number; locked: boolean; chosenMode?: 'WIZARD' | 'TOWER' | undefined }
  // 等待点塔
  | { type: 'PLAY_CARD_TOWER_PICK'; cardId: CardID; moveValue: number; locked: boolean; chosenMode?: 'WIZARD' | 'TOWER' | undefined }
  | { type: 'CAST_SPELL_MOVE_WIZARD'; spellId: SpellID }
  | { type: 'CAST_SPELL_MOVE_TOWER'; spellId: SpellID }
  | { type: 'CAST_SPELL_FREE_WIZARD'; spellId: SpellID }
  | { type: 'CAST_SPELL_SWAP_FIRST'; spellId: SpellID }
  | { type: 'CAST_SPELL_SWAP_SECOND'; spellId: SpellID; spaceIndex1: SpaceIndex }
  | { type: 'CAST_SPELL_NO_TARGET'; spellId: SpellID }
  | { type: 'DISCARD_REDRAW_FLOW' };

const PHASE_LABEL: Record<string, string> = {
  TURN_START: '回合开始',
  ACTION_1: '行动 1',
  ACTION_2: '行动 2',
  ACTION_DONE: '行动完毕',
  TURN_END: '回合结束',
  GAME_END_PENDING: '终局待结算',
  GAME_FINISHED: '游戏结束',
};

function castCmd(playerId: PlayerID, type: ActionCommand['type'], payload: unknown): ActionCommand {
  return { commandId: '', playerId, type, payload: payload as ActionCommand['payload'] };
}

export function GameContainer({ onEnterReplay }: { onEnterReplay?: () => void }) {
  const { state, events, dispatch, isFinished, exportSave } = useGame(defaultConfig(2), 42);
  const [intent, setIntent] = useState<UIIntent>({ type: 'IDLE' });
  const [error, setError] = useState<string | null>(null);
  const [sliceStart, setSliceStart] = useState<{ spaceIndex: SpaceIndex; towerId: TowerID } | null>(null);

  const current = state.currentPlayerId;
  const finished = state.turnPhase === TurnPhase.GAME_FINISHED || isFinished;
  const playerColor = PLAYER_COLORS[current] ?? '#888';
  // F2 颜色隔离（V2 §8.1）：所有 visible 巫师的 onClick 仅当 owner === current 时生效
  const cells = useMemo(() => deriveAllSpaces(state, current), [state, current]);

  // U5 §10.1 响应式：< 960px 时降级为单列（舞台在上、侧栏在下）
  const [isNarrow, setIsNarrow] = useState(() =>
    typeof window !== 'undefined' && window.innerWidth < 960,
  );
  useEffect(() => {
    const onResize = () => setIsNarrow(window.innerWidth < 960);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  /** 安全派发：捕获 RuleError 显示提示。成功返回引擎结算结果（含事件流），失败返回 null */
  const safeDispatch = useCallback((cmd: ActionCommand): ExecuteResult | null => {
    try {
      const result = dispatch(cmd);
      setError(null);
      return result;
    } catch (e) {
      const msg = e instanceof RuleError ? e.code : (e as Error).message;
      setError(msg);
      return null;
    }
  }, [dispatch]);

  const resetIntent = useCallback(() => {
    setIntent({ type: 'IDLE' });
    setSliceStart(null);
  }, []);

  // ---------- 手牌交互 ----------
  const handleCardClick = useCallback((cardId: CardID) => {
    setError(null);
    const tmpl = getCardTemplate(state, cardId);
    if (!tmpl) return;
    const isDice = tmpl.moveValueMode === 'DICE';
    if (tmpl.type === MovementCardType.MOVE_WIZARD) {
      if (isDice) {
        setIntent({ type: 'PLAY_CARD_DICE', cardId, tmpl, chosenMode: 'WIZARD' });
      } else {
        setIntent({ type: 'PLAY_CARD_WIZARD', cardId, moveValue: tmpl.fixedValue ?? 0, locked: false });
      }
    } else if (tmpl.type === MovementCardType.MOVE_TOWER) {
      if (isDice) {
        setIntent({ type: 'PLAY_CARD_DICE', cardId, tmpl, chosenMode: 'TOWER' });
      } else {
        setIntent({ type: 'PLAY_CARD_TOWER_PICK', cardId, moveValue: tmpl.fixedValue ?? 0, locked: false });
      }
    } else {
      // 二选一牌：先选模式（骰子/固定都先选模式）
      setIntent({ type: 'PLAY_CARD_MODE_CHOICE', cardId, tmpl });
    }
  }, [state]);

  const chooseMode = useCallback((mode: 'WIZARD' | 'TOWER') => {
    if (intent.type !== 'PLAY_CARD_MODE_CHOICE') return;
    const { cardId, tmpl } = intent;
    if (tmpl.moveValueMode === 'DICE') {
      setIntent({ type: 'PLAY_CARD_DICE', cardId, tmpl, chosenMode: mode });
    } else if (mode === 'WIZARD') {
      setIntent({ type: 'PLAY_CARD_WIZARD', cardId, moveValue: tmpl.fixedValue ?? 0, locked: false, chosenMode: 'WIZARD' });
    } else {
      // 二选一牌选塔模式：必须传 chosenMode='TOWER'，否则 play-card.resolveMode 抛 INVALID_PHASE
      setIntent({ type: 'PLAY_CARD_TOWER_PICK', cardId, moveValue: tmpl.fixedValue ?? 0, locked: false, chosenMode: 'TOWER' });
    }
  }, [intent]);

  /** 骰子牌掷骰：客户端真随机 1~6，掷出后锁定不可取消 */
  const rollDice = useCallback(() => {
    if (intent.type !== 'PLAY_CARD_DICE') return;
    const value = 1 + Math.floor(Math.random() * 6);
    const { cardId, chosenMode } = intent;
    if (chosenMode === 'WIZARD') {
      setIntent({ type: 'PLAY_CARD_WIZARD', cardId, moveValue: value, locked: true, chosenMode });
    } else {
      setIntent({ type: 'PLAY_CARD_TOWER_PICK', cardId, moveValue: value, locked: true, chosenMode });
    }
  }, [intent]);

  /**
   * 无合法目标时"继续出牌"：掷骰锁定后若场上无巫师/塔可选，无法取消会卡死。
   * 出口 = 不带目标发 PLAY_CARD，引擎走「无合法目标 -> 行动消耗」路径
   * （play-card.ts: card 已 emit CARD_DISCARDED，再 advanceOrEndTurn），本牌作废、推进下一步。
   */
  const handleContinueNoTarget = useCallback(() => {
    if (intent.type !== 'PLAY_CARD_WIZARD' && intent.type !== 'PLAY_CARD_TOWER_PICK') return;
    const ok = safeDispatch(
      castCmd(current, 'PLAY_CARD', {
        cardId: intent.cardId,
        resolvedMoveValue: intent.moveValue,
        // 二选一牌需要传 chosenMode；不带 wizardId / 塔目标
        ...(intent.chosenMode ? { chosenMode: intent.chosenMode } : {}),
      }),
    );
    if (ok) resetIntent();
  }, [intent, current, safeDispatch, resetIntent]);

  // ---------- 棋盘点击 ----------
  const handleWizardClick = useCallback((wizardId: WizardID) => {
    setError(null);
    if (intent.type === 'PLAY_CARD_WIZARD') {
      const ok = safeDispatch(
        castCmd(current, 'PLAY_CARD', {
          cardId: intent.cardId,
          wizardId,
          resolvedMoveValue: intent.moveValue,
          // 二选一牌需要传 chosenMode
          ...(intent.chosenMode ? { chosenMode: intent.chosenMode } : {}),
        }),
      );
      if (ok) resetIntent();
    } else if (intent.type === 'CAST_SPELL_MOVE_WIZARD') {
      // MOVE_WIZARD_1：顺时针 1 格，目标唯一确定 -> 点巫师即自动施法。
      // 不再让玩家点目标格：目标格若有塔/巫师会拦截 onSpaceClick，导致法术卡死。
      const w = state.wizards[wizardId];
      if (w && (w.state.mode === WizardStateType.ON_GROUND || w.state.mode === WizardStateType.ON_TOWER_TOP)) {
        const fromIdx = (w.state as { spaceIndex: number }).spaceIndex;
        const targetSpaceIndex = clockwiseSpace(fromIdx, 1, state.board.spaces.length);
        const ok = safeDispatch(
          castCmd(current, 'CAST_SPELL', {
            spellId: intent.spellId,
            targetDecision: { wizardId, targetSpaceIndex },
          }),
        );
        if (ok) resetIntent();
      }
    }
  }, [intent, current, state, safeDispatch, resetIntent]);

  const handleSpaceClick = useCallback((spaceIndex: SpaceIndex) => {
    setError(null);
    if (intent.type === 'CAST_SPELL_SWAP_FIRST') {
      setIntent({ type: 'CAST_SPELL_SWAP_SECOND', spellId: intent.spellId, spaceIndex1: spaceIndex });
    } else if (intent.type === 'CAST_SPELL_SWAP_SECOND') {
      const ok = safeDispatch(
        castCmd(current, 'CAST_SPELL', {
          spellId: intent.spellId,
          targetDecision: { spaceIndex1: intent.spaceIndex1, spaceIndex2: spaceIndex },
        }),
      );
      if (ok) resetIntent();
    }
  }, [intent, current, safeDispatch, resetIntent]);

  const handleTowerClick = useCallback((spaceIndex: SpaceIndex, towerId: TowerID) => {
    setError(null);
    if (intent.type === 'PLAY_CARD_TOWER_PICK') {
      setSliceStart({ spaceIndex, towerId });
      const ok = safeDispatch(
        castCmd(current, 'PLAY_CARD', {
          cardId: intent.cardId,
          towerSourceSpaceIndex: spaceIndex,
          pickedTowerId: towerId,
          resolvedMoveValue: intent.moveValue,
          // 二选一牌需要传 chosenMode
          ...(intent.chosenMode ? { chosenMode: intent.chosenMode } : {}),
        }),
      );
      if (ok) resetIntent();
    } else if (intent.type === 'DISCARD_REDRAW_FLOW') {
      // F3 弃 3 重抽 + 选塔：dispatch DISCARD_REDRAW with moveTowerAfterRedraw=true
      const ok = safeDispatch(
        castCmd(current, 'DISCARD_REDRAW', {
          moveTowerAfterRedraw: true,
          towerSourceSpaceIndex: spaceIndex,
          pickedTowerId: towerId,
        }),
      );
      if (ok) resetIntent();
    } else if (intent.type === 'CAST_SPELL_MOVE_TOWER') {
      // MOVE_TOWER_2 默认移动 2 格
      const ok = safeDispatch(
        castCmd(current, 'CAST_SPELL', {
          spellId: intent.spellId,
          targetDecision: { towerSourceSpaceIndex: spaceIndex, pickedTowerId: towerId, steps: 2 },
        }),
      );
      if (ok) resetIntent();
    } else if (intent.type === 'CAST_SPELL_FREE_WIZARD') {
      // FREE_A_WIZARD：点击一座塔，引擎检查该塔堆下是否有己方封印巫师。
      // 命中才解救；点错塔药水照扣、不解救，只有 1 次机会。
      const result = safeDispatch(
        castCmd(current, 'CAST_SPELL', {
          spellId: intent.spellId,
          targetDecision: { towerSourceSpaceIndex: spaceIndex, pickedTowerId: towerId },
        }),
      );
      if (result) {
        const rescued = result.events.some((e) => e.type === 'WIZARD_RELEASED');
        if (!rescued) setError('解救失败：该塔下没有你的巫师，药水已消耗');
        resetIntent();
      }
    }
  }, [intent, current, safeDispatch, resetIntent]);

  // ---------- 法术交互 ----------
  const handleCastSpell = useCallback((spellId: SpellID) => {
    setError(null);
    setSliceStart(null);
    switch (spellId) {
      case 'MOVE_WIZARD_1':
        setIntent({ type: 'CAST_SPELL_MOVE_WIZARD', spellId });
        break;
      case 'MOVE_TOWER_2':
        setIntent({ type: 'CAST_SPELL_MOVE_TOWER', spellId });
        break;
      case 'FREE_A_WIZARD':
        setIntent({ type: 'CAST_SPELL_FREE_WIZARD', spellId });
        break;
      case 'SWAP_TWO_TOWERS':
        setIntent({ type: 'CAST_SPELL_SWAP_FIRST', spellId });
        break;
      case 'MOVE_RAVEN_CASTLE':
      case 'DRAW_CARD': {
        setIntent({ type: 'CAST_SPELL_NO_TARGET', spellId });
        // 无目标法术直接施放
        const ok = safeDispatch(
          castCmd(state.currentPlayerId, 'CAST_SPELL', { spellId, targetDecision: {} }),
        );
        if (ok) resetIntent();
        break;
      }
      default:
        // REUSE_LAST_CARD 暂不支持复杂目标选择
        setError(`${spellId} 的交互暂未实现，请用其他法术`);
    }
  }, [safeDispatch, resetIntent, state.currentPlayerId]);

  // §10.4 卡牌选中后可操作巫师高亮集合（塔不发光）。纯 client 侧按 intent + F2 过滤，不预演合法性。
  const highlightableWizards = useMemo(() => {
    const set = new Set<WizardID>();
    if (intent.type === 'PLAY_CARD_WIZARD' || intent.type === 'CAST_SPELL_MOVE_WIZARD') {
      for (const w of wizardsOfPlayer(state, current)) {
        if (isWizardVisible(w)) set.add(w.id);
      }
    }
    return set;
  }, [intent, state, current]);

  return (
    <div
      className="wt-root-glow"
      data-glow-off={finished ? '1' : undefined}
      style={
        {
          fontFamily: 'sans-serif',
          padding: 8,
          height: '100vh',
          boxSizing: 'border-box',
          display: 'flex',
          flexDirection: 'column',
          gap: 6,
          ['--wt-current-color' as string]: playerColor,
        } as React.CSSProperties
      }
    >
      <header
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: 12,
          flexShrink: 0,
        }}
      >
        <h1 style={{ margin: 0, fontSize: 18 }}>巫师飞塔</h1>
        <div style={{ fontSize: 13, flex: 1, textAlign: 'center' }}>
          当前：<strong>{current}</strong> · 阶段：{PHASE_LABEL[state.turnPhase] ?? state.turnPhase} · 轮次 {state.roundNumber}
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          <button
            onClick={() => {
              const save = exportSave();
              const blob = new Blob([JSON.stringify(save, null, 2)], { type: 'application/json' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = `${save.gameId}.json`;
              a.click();
              URL.revokeObjectURL(url);
            }}
            title="导出当前对局为 JSON（用于回放/复盘）"
            style={{ cursor: 'pointer', fontSize: 12 }}
          >
            💾 导出
          </button>
          {onEnterReplay && (
            <button onClick={onEnterReplay} style={{ cursor: 'pointer', fontSize: 12 }}>
              📼 加载
            </button>
          )}
        </div>
      </header>

      {error && (
        <div
          style={{
            background: '#fdecea',
            color: '#c0392b',
            padding: '4px 10px',
            borderRadius: 4,
            fontSize: 12,
            flexShrink: 0,
          }}
        >
          ⚠ {error}
        </div>
      )}

      {/* 主区域：左舞台（1:1 锁定）/ 右侧栏（固定宽 320px）；窄屏降级为单列 */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: isNarrow ? '1fr' : '1fr 320px',
          gridAutoRows: isNarrow ? 'min-content' : undefined,
          gap: 8,
          flex: 1,
          minHeight: 0,
          overflow: isNarrow ? 'auto' : undefined,
        }}
      >
        <StageViewport
          cells={cells}
          sliceStart={sliceStart}
          highlightWizards={highlightableWizards}
          glowOff={finished}
          onWizardClick={
            intent.type === 'PLAY_CARD_WIZARD' ||
            intent.type === 'CAST_SPELL_MOVE_WIZARD'
              ? handleWizardClick
              : undefined
          }
          onTowerClick={
            intent.type === 'PLAY_CARD_TOWER_PICK' ||
            intent.type === 'CAST_SPELL_MOVE_TOWER' ||
            intent.type === 'CAST_SPELL_FREE_WIZARD' ||
            intent.type === 'DISCARD_REDRAW_FLOW'
              ? handleTowerClick
              : undefined
          }
          onSpaceClick={
            intent.type === 'CAST_SPELL_SWAP_FIRST' ||
            intent.type === 'CAST_SPELL_SWAP_SECOND'
              ? handleSpaceClick
              : undefined
          }
        />

        {/* 右侧栏四区（§10.3） */}
        <aside
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 6,
            overflowY: 'auto',
            minWidth: 0,
            minHeight: 0,
          }}
        >
          {/* 1. 玩家信息区 */}
          <PlayerBar state={state} currentId={current} />

          {/* 2. 手牌区 + 操作提示 */}
          <div style={{ minWidth: 0 }}>
            {/* 出牌 / 法术操作提示横幅：放在手牌上方，宽度与手牌区一致，
                避免提示条占用舞台垂直空间导致 1:1 舞台尺寸抖动。 */}
            {intent.type !== 'IDLE' && intent.type !== 'PLAY_CARD_MODE_CHOICE' && intent.type !== 'DISCARD_REDRAW_FLOW' && (
              <div
                style={{
                  background: '#e8f5e9',
                  padding: '4px 10px',
                  borderRadius: 4,
                  fontSize: 12,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  marginBottom: 4,
                  flexWrap: 'wrap',
                }}
              >
                {intent.type === 'PLAY_CARD_DICE' ? (
                  <Dice value={null} onRoll={rollDice} />
                ) : (
                  <span>{intentPrompt(intent)}</span>
                )}
                {(() => {
                  // locked（骰子已掷出）后不可取消，必须选目标
                  const isWizardIntent = intent.type === 'PLAY_CARD_WIZARD';
                  const isTowerIntent = intent.type === 'PLAY_CARD_TOWER_PICK';
                  const locked = (isWizardIntent || isTowerIntent) && intent.locked;
                  if (!locked) {
                    return (
                      <button onClick={resetIntent} style={{ marginLeft: 'auto', cursor: 'pointer' }}>取消</button>
                    );
                  }
                  // 锁定后若无合法目标（己方无可见巫师 / 场上无塔），提供"继续出牌"作废本牌出口
                  const noTarget =
                    (isWizardIntent && highlightableWizards.size === 0) ||
                    (isTowerIntent && !state.board.spaces.some((s) => s.towerStack.length > 0));
                  if (noTarget) {
                    return (
                      <button
                        onClick={handleContinueNoTarget}
                        title="无合法目标，本牌作废并推进到下一步"
                        style={{ marginLeft: 'auto', cursor: 'pointer' }}
                      >
                        继续出牌（本牌作废）
                      </button>
                    );
                  }
                  return <span style={{ marginLeft: 'auto', color: '#888' }}>已锁定</span>;
                })()}
              </div>
            )}
            {intent.type === 'DISCARD_REDRAW_FLOW' && (
              <div
                style={{
                  background: '#e8f5e9',
                  padding: '4px 8px',
                  borderRadius: 4,
                  fontSize: 12,
                  display: 'flex',
                  alignItems: 'center',
                  marginBottom: 4,
                  flexWrap: 'wrap',
                  gap: 4,
                }}
              >
                <span>弃 3 重抽：点塔前进 1 格（可选）</span>
                <button
                  onClick={() => {
                    const ok = safeDispatch(
                      castCmd(current, 'DISCARD_REDRAW', { moveTowerAfterRedraw: false }),
                    );
                    if (ok) resetIntent();
                  }}
                  style={{ margin: '0 4px', cursor: 'pointer' }}
                >
                  不选（直接结束）
                </button>
                <button onClick={resetIntent} style={{ marginLeft: 'auto', cursor: 'pointer' }}>取消</button>
              </div>
            )}
            {intent.type === 'PLAY_CARD_MODE_CHOICE' && (
              <div
                style={{
                  background: '#e8f5e9',
                  padding: '4px 8px',
                  borderRadius: 4,
                  fontSize: 12,
                  display: 'flex',
                  alignItems: 'center',
                  marginBottom: 4,
                  flexWrap: 'wrap',
                  gap: 4,
                }}
              >
                <span>二选一牌（{intent.tmpl.moveValueMode === 'DICE' ? '骰' : `${intent.tmpl.fixedValue}`}格）：选模式</span>
                <button onClick={() => chooseMode('WIZARD')} style={{ margin: '0 4px', cursor: 'pointer' }}>巫师</button>
                <button onClick={() => chooseMode('TOWER')} style={{ margin: '0 4px', cursor: 'pointer' }}>塔</button>
                <button onClick={resetIntent} style={{ marginLeft: 'auto', cursor: 'pointer' }}>取消</button>
              </div>
            )}
            {/* F3 弃 3 重抽触发按钮：仅 ACTION_1 阶段 + 手牌非空 + 未结束 + 不在其他 intent */}
            {state.turnPhase === TurnPhase.ACTION_1 &&
              intent.type === 'IDLE' &&
              !isFinished &&
              (state.players[current]?.hand.length ?? 0) > 0 && (
                <div style={{ marginBottom: 4 }}>
                  <button
                    onClick={() => {
                      setError(null);
                      setSliceStart(null);
                      setIntent({ type: 'DISCARD_REDRAW_FLOW' });
                    }}
                    style={{ cursor: 'pointer', fontSize: 12, padding: '2px 10px' }}
                    title="弃 3 张重抽（可选移动一座塔前进 1 格）"
                  >
                    弃 3 张重抽
                  </button>
                </div>
              )}
            <HandPanel
              state={state}
              playerId={current}
              selectedCardId={
                intent.type === 'PLAY_CARD_WIZARD' || intent.type === 'PLAY_CARD_TOWER_PICK' || intent.type === 'PLAY_CARD_MODE_CHOICE'
                  ? intent.cardId
                  : null
              }
              onCardClick={handleCardClick}
              disabled={
                isFinished ||
                state.turnPhase === TurnPhase.GAME_FINISHED ||
                state.turnPhase === TurnPhase.ACTION_DONE
              }
            />
          </div>

          {/* 3. 魔法药水区（仅当前玩家） */}
          <PotionPanel state={state} playerId={current} />

          {/* 4. 法术区 */}
          <SpellPanel state={state} playerId={current} onCastSpell={handleCastSpell} />

          {/* 5. 结束回合（操作区最下方）——打完牌后不再自动结束，由玩家显式结束 */
            !isFinished &&
            (state.turnPhase === TurnPhase.ACTION_1 ||
              state.turnPhase === TurnPhase.ACTION_2 ||
              state.turnPhase === TurnPhase.ACTION_DONE) && (
              <button
                onClick={() => {
                  resetIntent();
                  safeDispatch(castCmd(current, 'END_TURN', {}));
                }}
                title="结束本回合（补牌并轮转到下一玩家）"
                style={{
                  padding: '8px 10px',
                  cursor: 'pointer',
                  background: '#c0392b',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 6,
                  fontSize: 13,
                  fontWeight: 'bold',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
                }}
              >
                结束回合
              </button>
            )}
        </aside>
      </div>

      {isFinished && <WinnerPanel state={state} />}

      {isDebugMode() && <DebugPanel state={state} dispatch={dispatch} />}

      {/* 日志：角落图标（§10.6） */}
      <LogPanel events={events as GameEvent[]} />
    </div>
  );
}

function intentPrompt(intent: UIIntent): string {
  switch (intent.type) {
    case 'PLAY_CARD_DICE':
      return `骰子牌：点击骰子掷出点数`;
    case 'PLAY_CARD_WIZARD':
      return `巫师牌（${intent.moveValue}格）：点击你要移动的可见巫师${intent.locked ? '（已掷出，不可取消）' : ''}`;
    case 'PLAY_CARD_TOWER_PICK':
      return `塔牌（${intent.moveValue}格）：点击要移动的塔（该塔及以上整段移动）${intent.locked ? '（已掷出，不可取消）' : ''}`;
    case 'PLAY_CARD_MODE_CHOICE':
      return `二选一牌：选择模式`;
    case 'CAST_SPELL_MOVE_WIZARD':
      return `移动巫师：点击你要移动的己方巫师（顺时针 1 格）`;
    case 'CAST_SPELL_MOVE_TOWER':
      return `移动塔：点击要移动的塔（默认 2 格）`;
    case 'CAST_SPELL_FREE_WIZARD':
      return `解封巫师：点击一座塔——若塔下藏有你的巫师则解救到塔顶，否则药水照扣（仅 1 次机会）`;
    case 'CAST_SPELL_SWAP_FIRST':
      return `交换双塔：点击第一个塔堆所在空间`;
    case 'CAST_SPELL_SWAP_SECOND':
      return `交换双塔：点击第二个塔堆所在空间`;
    case 'CAST_SPELL_NO_TARGET':
      return `施法中...`;
    default:
      return '';
  }
}
