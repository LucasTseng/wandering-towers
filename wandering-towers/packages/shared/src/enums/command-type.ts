/**
 * 统一命令类型（V3 数据字典 §15.2 / V3 后端协议 §8）
 */
export const CommandType = {
  PLAY_CARD: 'PLAY_CARD',
  DISCARD_REDRAW: 'DISCARD_REDRAW',
  CAST_SPELL: 'CAST_SPELL',
  END_TURN: 'END_TURN',
  CHOOSE_DICE_RESULT: 'CHOOSE_DICE_RESULT',
  SKIP_SECOND_ACTION: 'SKIP_SECOND_ACTION',
} as const;

export type CommandType = (typeof CommandType)[keyof typeof CommandType];
