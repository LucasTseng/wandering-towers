import { useCallback, useMemo, useState } from 'react';
import type { ActionCommand, CardID, GameEvent, GameState, PlayerID, SpaceIndex, SpellID, TowerID, WizardID } from '@wt/shared';
import { RuleError } from '@wt/engine';
import { MovementCardType, TurnPhase, WizardStateType } from '@wt/shared';
import { clockwiseSpace } from '@wt/engine';
import { useGame } from '../game/useGame';
import { defaultConfig } from '../game/config';
import { deriveAllSpaces } from '../game/selectors';
import { getCardTemplate } from '../game/cardHelper';
import { Board } from '../components/Board';
import { HandPanel } from '../components/HandPanel';
import { PlayerInfo } from '../components/PlayerInfo';
import { SpellPanel } from '../components/SpellPanel';
import { LogPanel } from '../components/LogPanel';
import { WinnerPanel } from '../components/WinnerPanel';

/** UI 多步交互意图 */
type UIIntent =
  | { type: 'IDLE' }
  | { type: 'PLAY_CARD_WIZARD'; cardId: CardID; moveValue: number }
  | { type: 'PLAY_CARD_TOWER_PICK'; cardId: CardID; moveValue: number }
  | { type: 'PLAY_CARD_MODE_CHOICE'; cardId: CardID; moveValue: number }
  | { type: 'CAST_SPELL_MOVE_WIZARD'; spellId: SpellID }
  | { type: 'CAST_SPELL_MOVE_WIZARD_TARGET'; spellId: SpellID; wizardId: WizardID }
  | { type: 'CAST_SPELL_MOVE_TOWER'; spellId: SpellID }
  | { type: 'CAST_SPELL_FREE_WIZARD'; spellId: SpellID }
  | { type: 'CAST_SPELL_SWAP_FIRST'; spellId: SpellID }
  | { type: 'CAST_SPELL_SWAP_SECOND'; spellId: SpellID; spaceIndex1: SpaceIndex }
  | { type: 'CAST_SPELL_NO_TARGET'; spellId: SpellID };

const PHASE_LABEL: Record<string, string> = {
  TURN_START: '回合开始',
  ACTION_1: '行动 1',
  ACTION_2: '行动 2',
  TURN_END: '回合结束',
  GAME_END_PENDING: '终局待结算',
  GAME_FINISHED: '游戏结束',
};

function castCmd(playerId: PlayerID, type: ActionCommand['type'], payload: unknown): ActionCommand {
  return { commandId: '', playerId, type, payload: payload as ActionCommand['payload'] };
}

export function GameContainer() {
  const { state, events, dispatch, isFinished } = useGame(defaultConfig(2), 42);
  const [intent, setIntent] = useState<UIIntent>({ type: 'IDLE' });
  const [error, setError] = useState<string | null>(null);
  const [sliceStart, setSliceStart] = useState<{ spaceIndex: SpaceIndex; towerId: TowerID } | null>(null);

  const current = state.currentPlayerId;
  const cells = useMemo(() => deriveAllSpaces(state), [state]);

  /** 安全派发：捕获 RuleError 显示提示 */
  const safeDispatch = useCallback((cmd: ActionCommand) => {
    try {
      dispatch(cmd);
      setError(null);
      return true;
    } catch (e) {
      const msg = e instanceof RuleError ? e.code : (e as Error).message;
      setError(msg);
      return false;
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
    const moveValue = tmpl.fixedValue ?? 1;
    if (tmpl.moveValueMode !== 'FIXED') {
      setError('骰子牌暂不支持（待实装）');
      return;
    }
    if (tmpl.type === MovementCardType.MOVE_WIZARD) {
      setIntent({ type: 'PLAY_CARD_WIZARD', cardId, moveValue });
    } else if (tmpl.type === MovementCardType.MOVE_TOWER) {
      setIntent({ type: 'PLAY_CARD_TOWER_PICK', cardId, moveValue });
    } else {
      setIntent({ type: 'PLAY_CARD_MODE_CHOICE', cardId, moveValue });
    }
  }, [state]);

  const chooseMode = useCallback((mode: 'WIZARD' | 'TOWER') => {
    if (intent.type !== 'PLAY_CARD_MODE_CHOICE') return;
    if (mode === 'WIZARD') {
      setIntent({ type: 'PLAY_CARD_WIZARD', cardId: intent.cardId, moveValue: intent.moveValue });
    } else {
      setIntent({ type: 'PLAY_CARD_TOWER_PICK', cardId: intent.cardId, moveValue: intent.moveValue });
    }
  }, [intent]);

  // ---------- 棋盘点击 ----------
  const handleWizardClick = useCallback((wizardId: WizardID) => {
    setError(null);
    if (intent.type === 'PLAY_CARD_WIZARD') {
      const ok = safeDispatch(castCmd(current, 'PLAY_CARD', { cardId: intent.cardId, wizardId }));
      if (ok) resetIntent();
    } else if (intent.type === 'CAST_SPELL_MOVE_WIZARD') {
      setIntent({ type: 'CAST_SPELL_MOVE_WIZARD_TARGET', spellId: intent.spellId, wizardId });
    } else if (intent.type === 'CAST_SPELL_FREE_WIZARD') {
      const ok = safeDispatch(
        castCmd(current, 'CAST_SPELL', {
          spellId: intent.spellId,
          targetDecision: { imprisonedWizardId: wizardId },
        }),
      );
      if (ok) resetIntent();
    }
  }, [intent, current, safeDispatch, resetIntent]);

  const handleSpaceClick = useCallback((spaceIndex: SpaceIndex) => {
    setError(null);
    if (intent.type === 'CAST_SPELL_MOVE_WIZARD_TARGET') {
      const ok = safeDispatch(
        castCmd(current, 'CAST_SPELL', {
          spellId: intent.spellId,
          targetDecision: { wizardId: intent.wizardId, targetSpaceIndex: spaceIndex },
        }),
      );
      if (ok) resetIntent();
    } else if (intent.type === 'CAST_SPELL_SWAP_FIRST') {
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

  // 计算合法目标空间高亮（巫师牌：当前玩家可见巫师所在格 + 顺时针落点）
  const targetSpaces = useMemo(() => {
    const set = new Set<SpaceIndex>();
    if (intent.type === 'CAST_SPELL_MOVE_WIZARD_TARGET') {
      const w = state.wizards[intent.wizardId];
      if (w && w.state.mode !== WizardStateType.IN_CASTLE && w.state.mode !== WizardStateType.IMPRISONED) {
        const fromIdx = (w.state as { spaceIndex: number }).spaceIndex;
        set.add(clockwiseSpace(fromIdx, 1, state.board.spaces.length));
      }
    }
    return set;
  }, [intent, state]);

  return (
    <div style={{ fontFamily: 'sans-serif', padding: 12, maxWidth: 1200, margin: '0 auto' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1 style={{ margin: 0 }}>巫师飞塔 / The Wandering Towers</h1>
        <div style={{ fontSize: 14 }}>
          当前：<strong>{current}</strong> · 阶段：{PHASE_LABEL[state.turnPhase] ?? state.turnPhase} · 轮次 {state.roundNumber}
        </div>
      </header>

      {error && (
        <div style={{ background: '#fdecea', color: '#c0392b', padding: '6px 12px', borderRadius: 6, margin: '8px 0' }}>
          ⚠ {error}
        </div>
      )}

      {intent.type !== 'IDLE' && (
        <div style={{ background: '#e8f5e9', padding: '6px 12px', borderRadius: 6, margin: '8px 0', fontSize: 13, display: 'flex', alignItems: 'center' }}>
          <span>{intentPrompt(intent)}</span>
          {intent.type === 'PLAY_CARD_MODE_CHOICE' && (
            <span style={{ marginLeft: 12 }}>
              <button onClick={() => chooseMode('WIZARD')} style={{ margin: '0 4px', cursor: 'pointer' }}>巫师</button>
              <button onClick={() => chooseMode('TOWER')} style={{ margin: '0 4px', cursor: 'pointer' }}>塔</button>
            </span>
          )}
          <button onClick={resetIntent} style={{ marginLeft: 'auto', cursor: 'pointer' }}>取消</button>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '220px 1fr', gap: 12, marginTop: 12 }}>
        <aside>
          {state.playerOrder.map((pid) => (
            <PlayerInfo key={pid} state={state} playerId={pid} isCurrent={pid === current} />
          ))}
        </aside>

        <main>
          <Board
            cells={cells}
            targetSpaces={targetSpaces}
            sliceStart={sliceStart}
            onWizardClick={
              intent.type === 'PLAY_CARD_WIZARD' ||
              intent.type === 'CAST_SPELL_MOVE_WIZARD' ||
              intent.type === 'CAST_SPELL_FREE_WIZARD'
                ? handleWizardClick
                : undefined
            }
            onTowerClick={
              intent.type === 'PLAY_CARD_TOWER_PICK' || intent.type === 'CAST_SPELL_MOVE_TOWER'
                ? handleTowerClick
                : undefined
            }
            onSpaceClick={
              intent.type === 'CAST_SPELL_MOVE_WIZARD_TARGET' ||
              intent.type === 'CAST_SPELL_SWAP_FIRST' ||
              intent.type === 'CAST_SPELL_SWAP_SECOND'
                ? handleSpaceClick
                : undefined
            }
          />
          <div style={{ marginTop: 12 }}>
            <HandPanel
              state={state}
              playerId={current}
              selectedCardId={
                intent.type === 'PLAY_CARD_WIZARD' || intent.type === 'PLAY_CARD_TOWER_PICK' || intent.type === 'PLAY_CARD_MODE_CHOICE'
                  ? intent.cardId
                  : null
              }
              onCardClick={handleCardClick}
              disabled={isFinished || state.turnPhase === TurnPhase.GAME_FINISHED}
            />
          </div>
          <div style={{ marginTop: 8 }}>
            <SpellPanel state={state} playerId={current} onCastSpell={handleCastSpell} />
          </div>
          <div style={{ marginTop: 8 }}>
            <LogPanel events={events as GameEvent[]} />
          </div>
        </main>
      </div>

      {isFinished && <WinnerPanel state={state} />}
    </div>
  );
}

function intentPrompt(intent: UIIntent): string {
  switch (intent.type) {
    case 'PLAY_CARD_WIZARD':
      return `🧙 巫师牌（${intent.moveValue}格）：点击你要移动的可见巫师`;
    case 'PLAY_CARD_TOWER_PICK':
      return `🏰 塔牌（${intent.moveValue}格）：点击要移动的塔（该塔及以上整段移动）`;
    case 'PLAY_CARD_MODE_CHOICE':
      return `🃏 二选一牌（${intent.moveValue}格）：选择模式`;
    case 'CAST_SPELL_MOVE_WIZARD':
      return `🪄 移动巫师：点击要移动的巫师`;
    case 'CAST_SPELL_MOVE_WIZARD_TARGET':
      return `🪄 移动巫师：点击目标空间（高亮格）`;
    case 'CAST_SPELL_MOVE_TOWER':
      return `🪄 移动塔：点击要移动的塔（默认 2 格）`;
    case 'CAST_SPELL_FREE_WIZARD':
      return `🪄 解封巫师：点击被封印的巫师（开发模式可见塔内封印标记）`;
    case 'CAST_SPELL_SWAP_FIRST':
      return `🪄 交换双塔：点击第一个塔堆所在空间`;
    case 'CAST_SPELL_SWAP_SECOND':
      return `🪄 交换双塔：点击第二个塔堆所在空间`;
    case 'CAST_SPELL_NO_TARGET':
      return `🪄 施法中...`;
    default:
      return '';
  }
}
