/**
 * 回合阶段（V2 开发需求 §4 / V3 数据字典 §3.2 / V4 §10.2）
 *
 * TURN_START -> ACTION_1 -> ACTION_2 -> ACTION_DONE（行动完毕，仍可施法，待玩家显式结束）
 * 进堡 / DISCARD_REDRAW / SKIP_SECOND_ACTION -> 直接 TURN_END。
 * 终局触发后进入 GAME_END_PENDING，本轮结束后 GAME_FINISHED。
 *
 * ACTION_DONE：两个行动槽用尽后的"施法窗口"。此阶段禁止 PLAY_CARD（无更多行动），
 * 但允许 CAST_SPELL；玩家须显式发 END_TURN 才结束回合（V2 §17.2 法术可于行动后施放）。
 */
export const TurnPhase = {
  TURN_START: 'TURN_START',
  ACTION_1: 'ACTION_1',
  ACTION_2: 'ACTION_2',
  ACTION_DONE: 'ACTION_DONE',
  TURN_END: 'TURN_END',
  GAME_END_PENDING: 'GAME_END_PENDING',
  GAME_FINISHED: 'GAME_FINISHED',
} as const;

export type TurnPhase = (typeof TurnPhase)[keyof typeof TurnPhase];
