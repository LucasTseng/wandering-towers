/**
 * 基础 ID 类型（V3 数据字典 §2）
 *
 * - PlayerID: P1 / P2 / ...
 * - WizardID: W_<PlayerID>_<序号>
 * - TowerID: T01 ~ T09
 * - PotionID: PT_<PlayerID>_<序号>
 * - CardID: 牌库实例唯一 ID
 * - SpellID: 固定法术定义 ID
 */
export type PlayerID = string;
export type WizardID = string;
export type TowerID = string;
export type PotionID = string;
export type CardID = string;
export type SpellID = string;
export type CommandID = string;
export type EventID = string;
export type GameID = string;

/** 顺时针环形空间编号 0~15 */
export type SpaceIndex = number;
