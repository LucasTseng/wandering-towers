import type { ActionCommand, GameConfig, GameEvent, GameState } from '@wt/shared';
import { RuleErrorCode, TurnPhase } from '@wt/shared';
import { buildInitialState } from './state/state-builder';
import { applyEvents } from './state/apply-event';
import { EventAccumulator } from './event-bus';
import { RuleError } from './rule-error';
import type { Rng } from './state/rng';
import { createRng } from './state/rng';
import { playMovementCard } from './rules/play-card';
import { discardRedraw, skipSecondAction } from './rules/discard-redraw';
import { endTurnCleanup } from './rules/turn-flow';
import { finalizeWinners } from './rules/endgame';

/**
 * 规则引擎入口与结算管线（V4 §3 / V3 后端协议 §20-21）
 *
 * 结算管线：LoadState -> Validate -> Resolve -> ProduceEvents -> ApplyEvents -> Return
 * 引擎返回 { success, events, endTurn, endgameTriggered, stateVersion }（V3 §21）。
 */
export interface EngineOptions {
  seed?: number;
}

export interface ExecuteResult {
  success: true;
  events: GameEvent[];
  endTurn: boolean;
  endgameTriggered: boolean;
  stateVersion: number;
}

export class RuleEngine {
  readonly state: GameState;
  readonly rng: Rng;
  private initEvents: GameEvent[];

  constructor(config: GameConfig, options: EngineOptions = {}) {
    const { state, events, rng } = buildInitialState(config, options.seed);
    this.state = state;
    this.rng = rng;
    this.initEvents = events;
  }

  getInitEvents(): GameEvent[] {
    return [...this.initEvents];
  }

  /** 已结算事件累计序列（用于断线重连/回放） */
  getAllEvents(): GameEvent[] {
    return [...this.initEvents];
  }

  execute(command: ActionCommand): ExecuteResult {
    if (this.state.turnPhase === 'GAME_FINISHED') {
      throw new RuleError(RuleErrorCode.GAME_ALREADY_FINISHED);
    }

    const startSeq = this.state.stateVersion;
    const acc = new EventAccumulator(startSeq);
    const emit = (type: GameEvent['type'], payload: unknown) => acc.push(type, payload, command.playerId);

    let endTurn = false;
    let endgameTriggered = false;

    try {
      switch (command.type) {
        case 'PLAY_CARD': {
          const r = playMovementCard(this.state, command, emit);
          endTurn = r.endTurn;
          endgameTriggered = r.endgameTriggered ?? false;
          break;
        }
        case 'DISCARD_REDRAW': {
          const r = discardRedraw(this.state, command, emit);
          endTurn = r.endTurn;
          break;
        }
        case 'SKIP_SECOND_ACTION': {
          const r = skipSecondAction(this.state, command, emit);
          endTurn = r.endTurn;
          break;
        }
        case 'CAST_SPELL':
          throw new RuleError(RuleErrorCode.INVALID_PHASE, 'CAST_SPELL not implemented yet (Phase 2)');
        case 'END_TURN':
          // 显式结束回合（通常引擎在 endTurn=true 时自动清理，但也允许显式调用）
          endTurn = true;
          break;
        case 'CHOOSE_DICE_RESULT':
          throw new RuleError(RuleErrorCode.INVALID_PHASE, 'CHOOSE_DICE_RESULT not implemented yet');
        default:
          throw new RuleError(RuleErrorCode.INVALID_PHASE, `Unknown command type: ${String(command.type)}`);
      }
    } catch (e) {
      if (e instanceof RuleError) throw e;
      throw new RuleError(RuleErrorCode.INVALID_PHASE, (e as Error).message);
    }

    // 应用本命令产生的事件到状态
    // 注意：acc.all() 返回内部数组引用，须先快照长度，避免清理阶段追加事件后切片错位。
    const preCleanupCount = acc.count();
    applyEvents(this.state, acc.all().slice(0, preCleanupCount));

    // 回合结束清理：补牌 + 轮转 + 终局结算
    if (endTurn) {
      const cleanup = endTurnCleanup(this.state, emit);
      applyEvents(this.state, acc.all().slice(preCleanupCount));
      if (cleanup.gameFinished) {
        // 本轮结束且终局已触发 -> 结算胜负
        const beforeFinalize = acc.count();
        finalizeWinners(this.state, emit);
        applyEvents(this.state, acc.all().slice(beforeFinalize));
        this.state.turnPhase = TurnPhase.GAME_FINISHED;
      }
    }

    const allEvents = acc.all();
    return {
      success: true,
      events: allEvents,
      endTurn,
      endgameTriggered,
      stateVersion: this.state.stateVersion,
    };
  }
}

export function createEngine(config: GameConfig, options?: EngineOptions): {
  engine: RuleEngine;
  state: GameState;
  initEvents: GameEvent[];
} {
  const engine = new RuleEngine(config, options);
  return { engine, state: engine.state, initEvents: engine.getInitEvents() };
}

export { createRng };
