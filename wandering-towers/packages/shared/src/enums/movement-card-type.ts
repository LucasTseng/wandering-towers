/**
 * 移动牌类型（V2 开发需求 §4 / V3 数据字典 §3.5 / V2 规则 §8）
 *
 * - MOVE_WIZARD：巫师牌，只能移动自己的可见巫师
 * - MOVE_TOWER：塔牌，可移动任意一座塔
 * - MOVE_WIZARD_OR_TOWER：二选一牌，打出后选择移动巫师或塔
 */
export const MovementCardType = {
  MOVE_WIZARD: 'MOVE_WIZARD',
  MOVE_TOWER: 'MOVE_TOWER',
  MOVE_WIZARD_OR_TOWER: 'MOVE_WIZARD_OR_TOWER',
} as const;

export type MovementCardType = (typeof MovementCardType)[keyof typeof MovementCardType];
