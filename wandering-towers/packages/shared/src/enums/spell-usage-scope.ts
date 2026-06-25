/**
 * 法术可用范围标签（V4 §13.2 usage_scope 字段）
 * 用于声明一张法术可在哪些模式启用：BASIC / CUSTOM / MASTER
 */
export const SpellUsageScope = {
  BASIC: 'BASIC',
  CUSTOM: 'CUSTOM',
  MASTER: 'MASTER',
} as const;

export type SpellUsageScope = (typeof SpellUsageScope)[keyof typeof SpellUsageScope];
