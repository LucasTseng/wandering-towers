/**
 * 游戏模式（V2 开发需求 §2.1 / V3 数据字典 §3.1）
 *
 * - BASIC：基础游戏，默认 2 张法术，每回合最多 1 次施法，仅当前玩家施法
 * - CUSTOM：沿用基础回合结构，可自定义法术池
 * - MASTER_VARIANT：预留官方大师法师变体（更复杂的施法时机与响应窗口）
 */
export const GameMode = {
  BASIC: 'BASIC',
  CUSTOM: 'CUSTOM',
  MASTER_VARIANT: 'MASTER_VARIANT',
} as const;

export type GameMode = (typeof GameMode)[keyof typeof GameMode];
