/**
 * 行动来源（V2 开发需求 §4 / V3 数据字典 §3.6）
 *
 * - MOVEMENT_CARD：移动牌行动
 * - SPELL：法术行动
 * - DISCARD_REDRAW_TOWER_BONUS：弃 3 重抽后的可选移动塔 1 格
 */
export const ActionSource = {
  MOVEMENT_CARD: 'MOVEMENT_CARD',
  SPELL: 'SPELL',
  DISCARD_REDRAW_TOWER_BONUS: 'DISCARD_REDRAW_TOWER_BONUS',
} as const;

export type ActionSource = (typeof ActionSource)[keyof typeof ActionSource];
