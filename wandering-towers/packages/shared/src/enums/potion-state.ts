/**
 * 药水状态（V2 开发需求 §8 / V3 数据字典 §3.4 / V4 §10.2）
 *
 * 生命周期单向：EMPTY -> FULL -> SPENT，不可逆（V2 §15.1、§30）。
 * - EMPTY：空瓶
 * - FULL：满瓶，可用于施法
 * - SPENT：已消耗回盒，但仍计入终局「已完成填满」
 */
export const PotionState = {
  EMPTY: 'EMPTY',
  FULL: 'FULL',
  SPENT: 'SPENT',
} as const;

export type PotionState = (typeof PotionState)[keyof typeof PotionState];
