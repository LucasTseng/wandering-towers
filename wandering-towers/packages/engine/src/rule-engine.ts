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
import { checkEndgameTriggerForAnyPlayer, finalizeWinners } from './rules/endgame';
import { castSpell } from './spells/cast-spell';
// 副作用导入：模块加载时自动注册全部法术实现到 spell-registry
import './spells/implementations';

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
          // 骰子牌服务端权威掷骰（V3 §23.2 方案 A）：rng 返回 [0,1)
          const r = playMovementCard(this.state, command, emit, () => this.rng.next());
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
        case 'CAST_SPELL': {
          const r = castSpell(this.state, command, emit);
          endTurn = r.turnEnds;
          endgameTriggered = r.endgameTriggered;
          break;
        }
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
      // 非 RuleError 异常：包装为 INVALID_PHASE 但保留原始信息
      const msg = e instanceof Error ? e.message : String(e);
      console.error('[engine.execute] non-RuleError caught:', msg, e instanceof Error ? e.stack : '');
      throw new RuleError(RuleErrorCode.INVALID_PHASE, `internal: ${msg}`);
    }

    // 应用本命令产生的事件到状态
    // 注意：acc.all() 返回内部数组引用，各阶段须各自快照区间，避免事件被重复 apply。
    const commandEnd = acc.count();
    applyEvents(this.state, acc.all().slice(0, commandEnd));

    // 终局检查（V2 §34/§35）：必须在事件应用**之后**执行。
    // 规则函数只 emit 事件（进堡、封印奖励翻瓶、施法消耗都到此刻才落到 state），
    // 且必须覆盖 END_TURN / DISCARD_REDRAW / 塔牌封印等所有命令路径，
    // 不能只挂在「进堡」分支——否则条件达成后永远不会再被检查。
    const beforeEndgame = acc.count();
    if (checkEndgameTriggerForAnyPlayer(this.state, emit)) {
      endgameTriggered = true;
    }
    const afterEndgame = acc.count();
    if (afterEndgame > beforeEndgame) {
      applyEvents(this.state, acc.all().slice(beforeEndgame, afterEndgame));
    }

    // 回合结束清理：补牌 + 轮转 + 终局结算
    if (endTurn) {
      const beforeCleanup = acc.count();
      const cleanup = endTurnCleanup(this.state, emit);
      applyEvents(this.state, acc.all().slice(beforeCleanup));
      if (cleanup.gameFinished) {
        // 本轮结束且终局已触发 -> 结算胜负
        const beforeFinalize = acc.count();
        finalizeWinners(this.state, emit);
        applyEvents(this.state, acc.all().slice(beforeFinalize));
        this.state.turnPhase = TurnPhase.GAME_FINISHED;
      }
    }

    const allEvents = acc.all();
    // 每次成功结算命令后 stateVersion +1（V3 §5.2），用于联机防冲突 + 前端变化检测
    this.state.stateVersion += 1;
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
