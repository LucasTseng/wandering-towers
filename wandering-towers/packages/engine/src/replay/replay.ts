import type { GameEvent, GameConfig, GameState } from '@wt/shared';
import { buildInitialState } from '../state/state-builder';
import { applyEvents } from '../state/apply-event';

/**
 * 回放入口（V4 Step 3 / V3 后端协议 §19）
 *
 * 从 (config, seed) 构造初始状态，再依次应用事件流，得到最终 GameState。
 * 回放与原始对局的最终状态必须完全一致（TC-REPLAY-001）。
 *
 * 前提：事件流中已记录所有随机结果（骰子点数、洗牌顺序），
 * 因此回放不需要重新随机——initGame 用相同 seed 重建初始牌序即可。
 */

export interface ReplayInput {
  config: GameConfig;
  seed: number;
  events: GameEvent[];
}

export function replay(input: ReplayInput): GameState {
  const { state } = buildInitialState(input.config, input.seed);
  applyEvents(state, input.events);
  return state;
}

/** 从初始状态 + 空事件流，用于验证骨架 */
export function replayEmpty(config: GameConfig, seed?: number): GameState {
  const { state } = buildInitialState(config, seed);
  return state;
}
