/**
 * 法术启用选择方式（V2 开发需求 §13 / V3 数据字典 §5）
 *
 * - FIXED：指定法术列表
 * - RANDOM：从法术池随机抽取 N 张
 */
export const SpellSelectionMode = {
  FIXED: 'FIXED',
  RANDOM: 'RANDOM',
} as const;

export type SpellSelectionMode = (typeof SpellSelectionMode)[keyof typeof SpellSelectionMode];

/**
 * 施法时机模式（V3 数据字典 §5.2）
 * - ACTIVE_ONLY：只允许当前玩家在自己回合窗口施法
 * - REACTION_WINDOW：预留大师法师变体的响应窗口
 */
export const CastTimingMode = {
  ACTIVE_ONLY: 'ACTIVE_ONLY',
  REACTION_WINDOW: 'REACTION_WINDOW',
} as const;

export type CastTimingMode = (typeof CastTimingMode)[keyof typeof CastTimingMode];
