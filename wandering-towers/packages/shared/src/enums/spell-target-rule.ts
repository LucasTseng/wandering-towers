/**
 * 法术目标规则（V4 §13.4）
 */
export const SpellTargetRule = {
  OWN_VISIBLE_WIZARD: 'OWN_VISIBLE_WIZARD',
  ANY_VISIBLE_WIZARD: 'ANY_VISIBLE_WIZARD',
  OWN_OR_ANY_VISIBLE_WIZARD: 'OWN_OR_ANY_VISIBLE_WIZARD',
  ANY_TOWER_SEGMENT: 'ANY_TOWER_SEGMENT',
  ANY_TOWER_TOP: 'ANY_TOWER_TOP',
  NO_TARGET: 'NO_TARGET',
  RAVEN_CASTLE: 'RAVEN_CASTLE',
  CUSTOM: 'CUSTOM',
} as const;

export type SpellTargetRule = (typeof SpellTargetRule)[keyof typeof SpellTargetRule];
