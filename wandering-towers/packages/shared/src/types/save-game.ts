import type { GameConfig } from './game-config';
import type { GameEvent } from './game-event';
import type { GameState } from './game-state';

/**
 * SaveGame — 单局对局存档（V3 后端协议 §19 / §22 的本地单机版）
 *
 * 用于本地回放、复盘、AI 训练数据。
 * 字段说明：
 *  - gameId：本局唯一 ID（UUID 即可）
 *  - version：存档格式版本（用于未来兼容性）
 *  - config：开局配置（含玩家数、模式、法术池、seed 等）
 *  - seed：随机种子（用于 replay 重建初始牌序）
 *  - initialEvents：初始化阶段产生的事件（通常只有 INIT_COMPLETED）
 *  - recordedEvents：所有玩家动作产生的事件（按 sequence 排序）
 *
 * 回放流程（V3 §19）：
 *  1. buildInitialState(config, seed) 得到初始 GameState
 *  2. applyEvents(state, [...initialEvents, ...recordedEvents])
 *  3. 得到的 GameState 必须与原局最终状态完全一致（TC-REPLAY-001）
 */
export interface SaveGame {
  gameId: string;
  version: '1.0';
  savedAt: string; // ISO timestamp
  config: GameConfig;
  seed: number;
  initialEvents: GameEvent[];
  recordedEvents: GameEvent[];
  /** 可选：保存时的最终状态快照，用于快速校验。 */
  finalState?: GameState;
}
