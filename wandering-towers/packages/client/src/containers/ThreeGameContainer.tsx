import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ChangeEvent } from 'react';
import type {
  ActionCommand,
  CardID,
  GameEvent,
  MovementCardDefinition,
  PlayerID,
  SpaceIndex,
  SpellID,
  TowerID,
  WizardID,
} from '@wt/shared';
import { RuleError } from '@wt/engine';
import type { ExecuteResult } from '@wt/engine';
import { MovementCardType, TurnPhase } from '@wt/shared';
import { clockwiseSpace, isWizardVisible, wizardsOfPlayer } from '@wt/engine';
import { useGame } from '../game/useGame';
import { useReplay } from '../game/useReplay';
import { isValidSave } from '../game/replay';
import { defaultConfig, PLAYER_COLORS } from '../game/config';
import { deriveSceneCells, visibleWizardIdsOf, wizardSpaceIndexOf } from '../game/selectors';
import { applyStress, readStressParams } from '../game/debug';
import { EMPTY_INTERACTION } from '../game/types';
import type { StageInteraction } from '../game/types';
import { getCardTemplate } from '../game/cardHelper';
import { playerName } from '../scene/pieces';
import { TopBar } from '../components/TopBar';
import { ThreeStage, type StageApi } from '../components/ThreeStage';
import { HandPanel, PlayerPanel, PotionPanel, SpellPanel, EndTurnButton } from '../components/SidePanels';
import { ReplayPanel } from '../components/ReplayPanel';
import { LogDrawer, WinnerOverlay } from '../components/Overlays';
import type { TurnNotice } from './threeTypes';

/** UI 多步交互意图（与原版 GameContainer 完全一致） */
type UIIntent =
  | { type: 'IDLE' }
  | { type: 'PLAY_CARD_MODE_CHOICE'; cardId: CardID; tmpl: MovementCardDefinition }
  | { type: 'PLAY_CARD_DICE'; cardId: CardID; tmpl: MovementCardDefinition; chosenMode: 'WIZARD' | 'TOWER' }
  | {
      type: 'PLAY_CARD_WIZARD';
      cardId: CardID;
      moveValue: number;
      locked: boolean;
      chosenMode?: 'WIZARD' | 'TOWER' | undefined;
    }
  | {
      type: 'PLAY_CARD_TOWER_PICK';
      cardId: CardID;
      moveValue: number;
      locked: boolean;
      chosenMode?: 'WIZARD' | 'TOWER' | undefined;
    }
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

const RULE_ERROR_ZH: Record<string, string> = {
  NOT_CURRENT_PLAYER: '现在不是你的回合',
  INVALID_PHASE: '当前阶段不能执行该操作',
  CARD_NOT_IN_HAND: '这张牌不在手牌中',
  INVALID_WIZARD_TARGET: '目标巫师不可移动',
  INVALID_TOWER_TARGET: '目标塔不可移动',
  INVALID_MOVE_VALUE: '步数不合法',
  NO_LEGAL_TARGET: '没有合法目标',
  TARGET_CAPACITY_EXCEEDED: '落点已满（最多 6 名可见巫师）',
  TOWER_CANNOT_LAND_ON_CASTLE: '塔不能落在乌鸦城堡上',
  TOWER_IS_SEALED: '这座塔已被锁定',
  SPELL_LIMIT_REACHED: '本回合施法次数已用完',
  NOT_ENOUGH_FULL_POTIONS: '满药水瓶不足，无法施法',
  NO_FULL_POTION: '没有满药水瓶',
  INVALID_SPELL_TARGET: '法术目标不合法',
  GAME_ALREADY_FINISHED: '游戏已结束',
  LAST_WIZARD_NEEDS_NO_EMPTY_POTION: '最后一名巫师进堡前必须先耗尽所有空药水瓶',
};

function castCmd(playerId: PlayerID, type: ActionCommand['type'], payload: unknown): ActionCommand {
  return { commandId: '', playerId, type, payload: payload as ActionCommand['payload'] };
}

export function ThreeGameContainer() {
  const { state, events, dispatch, isFinished, exportSave, reset } = useGame(defaultConfig(2), 42);
  const [intent, setIntent] = useState<UIIntent>({ type: 'IDLE' });
  const [error, setError] = useState<string | null>(null);
  const [sliceStart, setSliceStart] = useState<{ spaceIndex: SpaceIndex; towerId: TowerID } | null>(null);
  const [logOpen, setLogOpen] = useState(false);
  const [stageReady, setStageReady] = useState(false);
  const stageApi = useRef<StageApi | null>(null);
  const replay = useReplay();
  const replayInputRef = useRef<HTMLInputElement>(null);
  const isReplay = replay.save !== null;
  /** 舞台/顶栏统一读 viewState：回放时是快照，对局时是实时状态 */
  const viewState = replay.snapshot ?? state;

  const current = viewState.currentPlayerId;
  const finished = !isReplay && (state.turnPhase === TurnPhase.GAME_FINISHED || isFinished);
  const playerColor = PLAYER_COLORS[current] ?? '#888';
  const phaseLabel = PHASE_LABEL[viewState.turnPhase] ?? viewState.turnPhase;
  const actionIndex =
    viewState.turnPhase === TurnPhase.ACTION_2 || viewState.turnPhase === TurnPhase.ACTION_DONE ? 2 : 1;

  const cells = useMemo(() => {
    const base = deriveSceneCells(viewState);
    const stress = readStressParams();
    return stress ? applyStress(base, stress.space, stress.count) : base;
  }, [viewState]);

  // ---------- 回合轮转提示 ----------
  const [turnNotice, setTurnNotice] = useState<TurnNotice | null>(null);
  const lastTurnRef = useRef<{ playerId: PlayerID; roundNumber: number } | null>(null);
  const noticeSeqRef = useRef(0);

  useEffect(() => {
    // 回放不是真实的回合流转，拖动进度条会不断改 current/round，
    // 必须屏蔽轮转提示，否则回放时中央会反复弹出「第 N 轮 · 请开始行动」挡住棋盘。
    if (isReplay) {
      lastTurnRef.current = null;
      setTurnNotice(null);
      return;
    }
    const snapshot = { playerId: current, roundNumber: viewState.roundNumber };
    const prev = lastTurnRef.current;
    lastTurnRef.current = snapshot;
    if (!prev || finished) return;
    if (prev.playerId === snapshot.playerId && prev.roundNumber === snapshot.roundNumber) return;
    noticeSeqRef.current += 1;
    setTurnNotice({
      key: noticeSeqRef.current,
      playerId: snapshot.playerId,
      roundNumber: snapshot.roundNumber,
      color: PLAYER_COLORS[snapshot.playerId] ?? '#e8b339',
    });
  }, [current, viewState.roundNumber, finished, isReplay]);

  useEffect(() => {
    if (!turnNotice) return;
    const timer = window.setTimeout(() => setTurnNotice(null), 3000);
    return () => window.clearTimeout(timer);
  }, [turnNotice]);

  // ---------- 派发 ----------
  const safeDispatch = useCallback(
    (cmd: ActionCommand): ExecuteResult | null => {
      try {
        const result = dispatch(cmd);
        setError(null);
        return result;
      } catch (e) {
        const msg =
          e instanceof RuleError
            ? RULE_ERROR_ZH[e.code] ?? (e.message && e.message !== e.code ? e.message : e.code)
            : (e as Error).message;
        setError(msg);
        return null;
      }
    },
    [dispatch],
  );

  const resetIntent = useCallback(() => {
    setIntent({ type: 'IDLE' });
    setSliceStart(null);
  }, []);

  // ---------- 手牌 ----------
  const handleCardClick = useCallback(
    (cardId: CardID) => {
      setError(null);
      const tmpl = getCardTemplate(state, cardId);
      if (!tmpl) return;
      const isDice = tmpl.moveValueMode === 'DICE';
      if (tmpl.type === MovementCardType.MOVE_WIZARD) {
        if (isDice) setIntent({ type: 'PLAY_CARD_DICE', cardId, tmpl, chosenMode: 'WIZARD' });
        else setIntent({ type: 'PLAY_CARD_WIZARD', cardId, moveValue: tmpl.fixedValue ?? 0, locked: false });
      } else if (tmpl.type === MovementCardType.MOVE_TOWER) {
        if (isDice) setIntent({ type: 'PLAY_CARD_DICE', cardId, tmpl, chosenMode: 'TOWER' });
        else setIntent({ type: 'PLAY_CARD_TOWER_PICK', cardId, moveValue: tmpl.fixedValue ?? 0, locked: false });
      } else {
        setIntent({ type: 'PLAY_CARD_MODE_CHOICE', cardId, tmpl });
      }
    },
    [state],
  );

  const chooseMode = useCallback(
    (mode: 'WIZARD' | 'TOWER') => {
      if (intent.type !== 'PLAY_CARD_MODE_CHOICE') return;
      const { cardId, tmpl } = intent;
      if (tmpl.moveValueMode === 'DICE') {
        setIntent({ type: 'PLAY_CARD_DICE', cardId, tmpl, chosenMode: mode });
      } else if (mode === 'WIZARD') {
        setIntent({
          type: 'PLAY_CARD_WIZARD',
          cardId,
          moveValue: tmpl.fixedValue ?? 0,
          locked: false,
          chosenMode: 'WIZARD',
        });
      } else {
        setIntent({
          type: 'PLAY_CARD_TOWER_PICK',
          cardId,
          moveValue: tmpl.fixedValue ?? 0,
          locked: false,
          chosenMode: 'TOWER',
        });
      }
    },
    [intent],
  );

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

  const handleContinueNoTarget = useCallback(() => {
    if (intent.type !== 'PLAY_CARD_WIZARD' && intent.type !== 'PLAY_CARD_TOWER_PICK') return;
    const ok = safeDispatch(
      castCmd(current, 'PLAY_CARD', {
        cardId: intent.cardId,
        resolvedMoveValue: intent.moveValue,
        ...(intent.chosenMode ? { chosenMode: intent.chosenMode } : {}),
      }),
    );
    if (ok) resetIntent();
  }, [intent, current, safeDispatch, resetIntent]);

  // ---------- 棋盘点击 ----------
  const handleWizardClick = useCallback(
    (wizardId: WizardID) => {
      if (intent.type === 'PLAY_CARD_WIZARD') {
        // F2 颜色隔离：只允许点己方可见巫师，点错给出提示而不派发
        if (!wizardsOfPlayer(state, current).some((w) => w.id === wizardId && isWizardVisible(w))) {
          setError('只能选择自己场上可见的巫师');
          return;
        }
        const ok = safeDispatch(
          castCmd(current, 'PLAY_CARD', {
            cardId: intent.cardId,
            wizardId,
            resolvedMoveValue: intent.moveValue,
            ...(intent.chosenMode ? { chosenMode: intent.chosenMode } : {}),
          }),
        );
        if (ok) resetIntent();
        return;
      }
      if (intent.type === 'CAST_SPELL_MOVE_WIZARD') {
        const wizard = state.wizards[wizardId];
        if (!wizard) return;
        if (wizard.ownerPlayerId !== current) {
          setError('只能移动自己的巫师');
          return;
        }
        if (wizard.state.mode === 'ON_GROUND' || wizard.state.mode === 'ON_TOWER_TOP') {
          const fromIdx = wizard.state.spaceIndex;
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
    },
    [intent, current, state, safeDispatch, resetIntent],
  );

  const handleSpaceClick = useCallback(
    (spaceIndex: SpaceIndex) => {
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
    },
    [intent, current, safeDispatch, resetIntent],
  );

  const handleTowerClick = useCallback(
    (spaceIndex: SpaceIndex, towerId: TowerID) => {
      if (intent.type === 'PLAY_CARD_TOWER_PICK') {
        setSliceStart({ spaceIndex, towerId });
        const ok = safeDispatch(
          castCmd(current, 'PLAY_CARD', {
            cardId: intent.cardId,
            towerSourceSpaceIndex: spaceIndex,
            pickedTowerId: towerId,
            resolvedMoveValue: intent.moveValue,
            ...(intent.chosenMode ? { chosenMode: intent.chosenMode } : {}),
          }),
        );
        if (ok) resetIntent();
      } else if (intent.type === 'DISCARD_REDRAW_FLOW') {
        const ok = safeDispatch(
          castCmd(current, 'DISCARD_REDRAW', {
            moveTowerAfterRedraw: true,
            towerSourceSpaceIndex: spaceIndex,
            pickedTowerId: towerId,
          }),
        );
        if (ok) resetIntent();
      } else if (intent.type === 'CAST_SPELL_MOVE_TOWER') {
        const ok = safeDispatch(
          castCmd(current, 'CAST_SPELL', {
            spellId: intent.spellId,
            targetDecision: { towerSourceSpaceIndex: spaceIndex, pickedTowerId: towerId, steps: 2 },
          }),
        );
        if (ok) resetIntent();
      } else if (intent.type === 'CAST_SPELL_FREE_WIZARD') {
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
    },
    [intent, current, safeDispatch, resetIntent],
  );

  // ---------- 法术 ----------
  const handleCastSpell = useCallback(
    (spellId: SpellID) => {
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
          const ok = safeDispatch(castCmd(current, 'CAST_SPELL', { spellId, targetDecision: {} }));
          if (ok) resetIntent();
          break;
        }
        default:
          setError(`${spellId} 的交互暂未实现，请用其他法术`);
      }
    },
    [safeDispatch, resetIntent, current],
  );

  // ---------- 场景交互态（纯展示推导，不预演合法性） ----------
  const liveInteraction = useMemo<StageInteraction>(() => {
    const highlightWizards = new Set<WizardID>();
    const selectableSpaces = new Set<SpaceIndex>();
    const targetSpaces = new Set<SpaceIndex>();

    if (intent.type === 'PLAY_CARD_WIZARD' || intent.type === 'CAST_SPELL_MOVE_WIZARD') {
      for (const wizardId of visibleWizardIdsOf(state, current)) {
        highlightWizards.add(wizardId);
        const spaceIndex = wizardSpaceIndexOf(state, wizardId);
        if (spaceIndex !== null) selectableSpaces.add(spaceIndex);
      }
    }

    if (
      intent.type === 'PLAY_CARD_TOWER_PICK' ||
      intent.type === 'CAST_SPELL_MOVE_TOWER' ||
      intent.type === 'CAST_SPELL_FREE_WIZARD' ||
      intent.type === 'DISCARD_REDRAW_FLOW' ||
      intent.type === 'CAST_SPELL_SWAP_FIRST' ||
      intent.type === 'CAST_SPELL_SWAP_SECOND'
    ) {
      for (const space of state.board.spaces) {
        if (space.towerStack.length > 0) selectableSpaces.add(space.index);
      }
    }

    // 金环：当前首选目标（己方巫师所在格 / 已选塔所在格）
    if (intent.type === 'PLAY_CARD_WIZARD' || intent.type === 'CAST_SPELL_MOVE_WIZARD') {
      for (const spaceIndex of selectableSpaces) targetSpaces.add(spaceIndex);
    }
    if (sliceStart) targetSpaces.add(sliceStart.spaceIndex);

    return {
      highlightWizards,
      selectableSpaces,
      targetSpaces,
      onWizardClick: handleWizardClick,
      onTowerClick: handleTowerClick,
      onSpaceClick:
        intent.type === 'CAST_SPELL_SWAP_FIRST' || intent.type === 'CAST_SPELL_SWAP_SECOND'
          ? handleSpaceClick
          : undefined,
    };
  }, [intent, state, current, sliceStart, handleWizardClick, handleTowerClick, handleSpaceClick]);

  /** 回放时舞台只读：清空全部高亮与点击回调，仅保留镜头操作 */
  const interaction = isReplay ? EMPTY_INTERACTION : liveInteraction;

  // ---------- 回放：存档加载 ----------
  const handleReplayFile = useCallback(
    async (event: ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      event.target.value = '';
      if (!file) return;
      try {
        const raw: unknown = JSON.parse(await file.text());
        if (!isValidSave(raw)) {
          setError('存档格式无效（不是合法的 SaveGame v1.0）');
          return;
        }
        setError(null);
        setLogOpen(false);
        replay.open(raw);
      } catch (cause) {
        setError(`回放解析失败：${(cause as Error).message}`);
      }
    },
    [replay.open],
  );

  // ---------- 顶栏动作 ----------
  const handleExport = useCallback(() => {
    const save = exportSave();
    const blob = new Blob([JSON.stringify(save, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `${save.gameId}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
  }, [exportSave]);

  const handleFullscreen = useCallback(() => {
    if (document.fullscreenElement) void document.exitFullscreen();
    else void document.documentElement.requestFullscreen().catch(() => setError('当前浏览器不允许全屏'));
  }, []);

  const handleNewGame = useCallback(() => {
    reset();
    resetIntent();
    setError(null);
  }, [reset, resetIntent]);

  const spellsDisabled = finished || state.turnPhase === TurnPhase.ACTION_DONE;

  return (
    <div className="app">
      <TopBar
        roundNumber={viewState.roundNumber}
        phaseLabel={phaseLabel}
        actionIndex={actionIndex}
        currentPlayerId={current}
        onResetCamera={() => stageApi.current?.resetCamera()}
        onToggleFullscreen={handleFullscreen}
        onExport={handleExport}
        onLoadReplay={() => replayInputRef.current?.click()}
        replay={isReplay ? { cursor: replay.cursor, total: replay.total, onExit: replay.close } : null}
      />

      <main className="main-layout">
        <ThreeStage
          ref={stageApi}
          cells={cells}
          interaction={interaction}
          currentPlayerId={current}
          playerName={playerName(current)}
          playerColor={playerColor}
          phaseLabel={phaseLabel}
          roundNumber={viewState.roundNumber}
          actionIndex={actionIndex}
          turnNotice={turnNotice}
          readOnly={isReplay}
          onReady={() => setStageReady(true)}
        />

        <aside className="sidebar">
          {error && (
            <div className="error-banner">
              {error}
              <button className="mini-button" style={{ marginLeft: 8 }} onClick={() => setError(null)}>
                知道了
              </button>
            </div>
          )}

          {isReplay && replay.snapshot ? (
            <ReplayPanel
              state={replay.snapshot}
              events={replay.events}
              cursor={replay.cursor}
              total={replay.total}
              playing={replay.playing}
              speed={replay.speed}
              onSeek={replay.seek}
              onTogglePlay={replay.toggle}
              onSpeed={replay.setSpeed}
              onExit={replay.close}
            />
          ) : (
            <>
              <PlayerPanel
                state={state}
                playerId={current}
                phaseLabel={phaseLabel}
                actionIndex={actionIndex}
                color={playerColor}
              />

              <IntentBanner
                intent={intent}
                state={state}
                current={current}
                highlightCount={interaction.highlightWizards.size}
                onRollDice={rollDice}
                onCancel={resetIntent}
                onChooseMode={chooseMode}
                onContinueNoTarget={handleContinueNoTarget}
                onDiscardRedrawNoMove={() => {
                  const ok = safeDispatch(castCmd(current, 'DISCARD_REDRAW', { moveTowerAfterRedraw: false }));
                  if (ok) resetIntent();
                }}
                onDiscardRedrawStart={() => {
                  setError(null);
                  setSliceStart(null);
                  setIntent({ type: 'DISCARD_REDRAW_FLOW' });
                }}
                finished={finished}
              />

              <HandPanel
                state={state}
                playerId={current}
                selectedCardId={
                  intent.type === 'PLAY_CARD_WIZARD' ||
                  intent.type === 'PLAY_CARD_TOWER_PICK' ||
                  intent.type === 'PLAY_CARD_MODE_CHOICE'
                    ? intent.cardId
                    : null
                }
                onCardClick={handleCardClick}
                disabled={finished || state.turnPhase === TurnPhase.ACTION_DONE}
              />

              <PotionPanel state={state} playerId={current} color={playerColor} />

              <SpellPanel
                state={state}
                playerId={current}
                onCastSpell={handleCastSpell}
                disabled={spellsDisabled}
              />

              {!finished &&
                (state.turnPhase === TurnPhase.ACTION_1 ||
                  state.turnPhase === TurnPhase.ACTION_2 ||
                  state.turnPhase === TurnPhase.ACTION_DONE) && (
                  <EndTurnButton
                    onClick={() => {
                      resetIntent();
                      safeDispatch(castCmd(current, 'END_TURN', {}));
                    }}
                  />
                )}

              <div className="demo-footnote">
                三维版与经典版共用同一套 @wt/engine 规则 · 渲染层独立
                <br />
                美术：程序化材质 + CC0 砂岩
              </div>
            </>
          )}
        </aside>
      </main>

      {!isReplay && (
        <LogDrawer
          events={events as GameEvent[]}
          open={logOpen}
          onToggle={() => setLogOpen((v) => !v)}
        />
      )}

      {finished && <WinnerOverlay state={state} onNewGame={handleNewGame} />}

      <input
        ref={replayInputRef}
        type="file"
        accept="application/json,.json"
        hidden
        onChange={handleReplayFile}
      />

      <div className={`loading-screen${stageReady ? ' is-ready' : ''}`}>
        <div className="loading-inner">
          <svg className="loading-crest" viewBox="0 0 100 112" aria-hidden="true">
            <defs>
              <linearGradient id="loadGold" x1="0" y1="0" x2="1" y2="1">
                <stop stopColor="#f4da92" />
                <stop offset="0.55" stopColor="#c69842" />
                <stop offset="1" stopColor="#8c672e" />
              </linearGradient>
              <linearGradient id="loadTeal" x1="0" y1="0" x2="1" y2="1">
                <stop stopColor="#4f9ba4" />
                <stop offset="1" stopColor="#205d6c" />
              </linearGradient>
            </defs>
            <path d="M50 2 L91 18 L86 70 Q70 96 50 108 Q30 96 14 70 L9 18Z" fill="url(#loadGold)" />
            <path d="M50 8 L84 22 L79 67 Q66 89 50 100 Q34 89 21 67 L16 22Z" fill="url(#loadTeal)" stroke="#e8cd84" strokeWidth="1.2" />
            <path d="M30 55 Q37 38 50 47 Q63 38 70 55 Q64 53 58 57 Q54 69 50 78 Q45 66 42 57 Q36 54 30 55Z" fill="#112f3a" />
          </svg>
          <div className="loading-title">巫师飞塔</div>
          <div className="loading-sub">RAVENREALM · CLOUDFIELD</div>
          <div className="loading-bar" />
          <div className="loading-caption">正在点亮渡鸦灯</div>
        </div>
      </div>
    </div>
  );
}

/* ---------------- 操作提示条 ---------------- */
function IntentBanner(props: {
  intent: UIIntent;
  state: Parameters<typeof deriveSceneCells>[0];
  current: PlayerID;
  highlightCount: number;
  finished: boolean;
  onRollDice: () => void;
  onCancel: () => void;
  onChooseMode: (mode: 'WIZARD' | 'TOWER') => void;
  onContinueNoTarget: () => void;
  onDiscardRedrawNoMove: () => void;
  onDiscardRedrawStart: () => void;
}) {
  const {
    intent,
    state,
    current,
    highlightCount,
    finished,
    onRollDice,
    onCancel,
    onChooseMode,
    onContinueNoTarget,
    onDiscardRedrawNoMove,
    onDiscardRedrawStart,
  } = props;

  if (finished) return null;

  if (intent.type === 'IDLE') {
    const canDiscard =
      state.turnPhase === TurnPhase.ACTION_1 && (state.players[current]?.hand.length ?? 0) > 0;
    if (!canDiscard) return null;
    return (
      <div className="intent-banner">
        <span className="intent-text">选择一张魔典出牌，或弃 3 张重抽。</span>
        <button className="mini-button" type="button" onClick={onDiscardRedrawStart} title="弃 3 张重抽（可选移动一座塔前进 1 格）">
          弃 3 张重抽
        </button>
      </div>
    );
  }

  if (intent.type === 'PLAY_CARD_DICE') {
    return (
      <div className="intent-banner">
        <button className="dice-button" type="button" onClick={onRollDice} title="掷骰">
          ⚄
        </button>
        <span className="intent-text">
          骰子牌（{intent.chosenMode === 'WIZARD' ? '巫师' : '塔'}）：点击骰子掷出点数
        </span>
        <button className="mini-button" type="button" onClick={onCancel}>
          取消
        </button>
      </div>
    );
  }

  if (intent.type === 'PLAY_CARD_MODE_CHOICE') {
    return (
      <div className="intent-banner">
        <span className="intent-text">
          二选一牌（{intent.tmpl.moveValueMode === 'DICE' ? '骰' : `${intent.tmpl.fixedValue}`} 格）：选择模式
        </span>
        <button className="mini-button is-primary" type="button" onClick={() => onChooseMode('WIZARD')}>
          巫师
        </button>
        <button className="mini-button is-primary" type="button" onClick={() => onChooseMode('TOWER')}>
          塔
        </button>
        <button className="mini-button" type="button" onClick={onCancel}>
          取消
        </button>
      </div>
    );
  }

  if (intent.type === 'DISCARD_REDRAW_FLOW') {
    return (
      <div className="intent-banner">
        <span className="intent-text">弃 3 张重抽：可点一座塔前进 1 格，或直接结束。</span>
        <button className="mini-button" type="button" onClick={onDiscardRedrawNoMove}>
          不选（直接结束）
        </button>
        <button className="mini-button" type="button" onClick={onCancel}>
          取消
        </button>
      </div>
    );
  }

  const locked =
    (intent.type === 'PLAY_CARD_WIZARD' || intent.type === 'PLAY_CARD_TOWER_PICK') && intent.locked;
  const noTarget =
    locked &&
    ((intent.type === 'PLAY_CARD_WIZARD' && highlightCount === 0) ||
      (intent.type === 'PLAY_CARD_TOWER_PICK' && !state.board.spaces.some((s) => s.towerStack.length > 0)));

  return (
    <div className={`intent-banner${locked ? ' is-locked' : ''}`}>
      <span className="intent-text">{intentPrompt(intent)}</span>
      {noTarget ? (
        <button className="mini-button is-primary" type="button" onClick={onContinueNoTarget} title="无合法目标，本牌作废并推进到下一步">
          继续出牌（本牌作废）
        </button>
      ) : locked ? (
        <span style={{ color: '#9a5b3d', fontSize: 9 }}>已锁定</span>
      ) : (
        <button className="mini-button" type="button" onClick={onCancel}>
          取消
        </button>
      )}
    </div>
  );
}

function intentPrompt(intent: UIIntent): string {
  switch (intent.type) {
    case 'PLAY_CARD_WIZARD':
      return `巫师牌（${intent.moveValue} 格）：点击你要移动的己方可见巫师${intent.locked ? '（已掷出，不可取消）' : ''}`;
    case 'PLAY_CARD_TOWER_PICK':
      return `塔牌（${intent.moveValue} 格）：点击要移动的塔（该塔及以上整段移动）${intent.locked ? '（已掷出，不可取消）' : ''}`;
    case 'CAST_SPELL_MOVE_WIZARD':
      return '移动巫师：点击你要移动的己方巫师（顺时针 1 格）';
    case 'CAST_SPELL_MOVE_TOWER':
      return '移动塔：点击要移动的塔（默认 2 格）';
    case 'CAST_SPELL_FREE_WIZARD':
      return '解封巫师：点击一座塔——若塔下藏有你的巫师则解救到塔顶，否则药水照扣（仅 1 次机会）';
    case 'CAST_SPELL_SWAP_FIRST':
      return '交换双塔：点击第一个塔堆所在空间';
    case 'CAST_SPELL_SWAP_SECOND':
      return '交换双塔：点击第二个塔堆所在空间';
    case 'CAST_SPELL_NO_TARGET':
      return '施法中…';
    default:
      return '';
  }
}
