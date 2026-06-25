/**
 * 法术时机规则（V4 §13.5）
 */
export const SpellTimingRule = {
  ACTIVE_PLAYER_TURN_WINDOW: 'ACTIVE_PLAYER_TURN_WINDOW',
  BEFORE_DURING_AFTER_ACTION: 'BEFORE_DURING_AFTER_ACTION',
  REACTION_WINDOW_ONLY: 'REACTION_WINDOW_ONLY',
  CUSTOM: 'CUSTOM',
} as const;

export type SpellTimingRule = (typeof SpellTimingRule)[keyof typeof SpellTimingRule];
