/**
 * 回合阶段（V2 开发需求 §4 / V3 数据字典 §3.2 / V4 §10.2）
 *
 * TURN_START -> ACTION_1 -> ACTION_2 -> TURN_END
 * 终局触发后进入 GAME_END_PENDING，本轮结束后 GAME_FINISHED。
 */
export const TurnPhase = {
  TURN_START: 'TURN_START',
  ACTION_1: 'ACTION_1',
  ACTION_2: 'ACTION_2',
  TURN_END: 'TURN_END',
  GAME_END_PENDING: 'GAME_END_PENDING',
  GAME_FINISHED: 'GAME_FINISHED',
} as const;

export type TurnPhase = (typeof TurnPhase)[keyof typeof TurnPhase];
