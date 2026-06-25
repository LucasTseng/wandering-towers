/**
 * 法术效果类型（V4 §13.3）
 */
export const SpellEffectType = {
  MOVE_WIZARD: 'MOVE_WIZARD',
  MOVE_TOWER: 'MOVE_TOWER',
  FREE_WIZARD: 'FREE_WIZARD',
  MOVE_RAVEN_CASTLE: 'MOVE_RAVEN_CASTLE',
  SWAP_TOWERS: 'SWAP_TOWERS',
  DRAW_CARD: 'DRAW_CARD',
  REUSE_CARD: 'REUSE_CARD',
  CUSTOM: 'CUSTOM',
} as const;

export type SpellEffectType = (typeof SpellEffectType)[keyof typeof SpellEffectType];
