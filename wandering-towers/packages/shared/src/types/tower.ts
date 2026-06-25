import type { TowerID, WizardID } from './ids';

/**
 * 塔运行时状态（V2 开发需求 §6.1 / V3 数据字典 §7）
 *
 * 注意：塔的空间位置与层级由 board.spaces[x].towerStack 决定，
 * TowerRuntimeState 不直接保存所在空间（V2 开发需求 §6.1）。
 */
export interface TowerRuntimeState {
  id: TowerID;
  /** 这座塔自身是否带乌鸦纹章 */
  hasRavenShield: boolean;
  /** 当前封印在此塔内的巫师 ID 列表（建议保持进入顺序） */
  imprisonedWizards: WizardID[];
  /**
   * 该塔是否被「塔封印」锁定（T1.6 扩展机制：被锁定的塔不可作为塔切片移动）。
   * 注意：这与巫师 IMPRISONED（被封印进塔内）是两个不同概念。
   */
  sealed: boolean;
}

/**
 * 塔堆切片（V2 开发需求 §6.2）
 * 从某座塔起向上切出，movedTowerIds 自下而上排列。
 */
export interface TowerSlice {
  sourceSpaceIndex: number;
  movedTowerIds: TowerID[]; // 自下而上
}
