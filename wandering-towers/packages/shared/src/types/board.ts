import type { SpaceIndex, TowerID, WizardID } from './ids';

/**
 * 空间状态（V2 开发需求 §5.2 / V3 数据字典 §6.2）
 */
export interface SpaceState {
  index: SpaceIndex;
  /** 该地面格本身是否为乌鸦纹章位 */
  groundHasRavenShield: boolean;
  /** 开局巫师容量（来自火苗数），仅用于初始化摆巫师 */
  setupCapacity: number;
  /** 当前站在该地面的可见巫师 ID 列表 */
  groundVisibleWizards: WizardID[];
  /** 自下而上排列的塔 ID 列表（bottom -> top） */
  towerStack: TowerID[];
}

/**
 * 棋盘状态（V2 开发需求 §5.3 / V3 数据字典 §6.1）
 * 固定 16 个空间，顺时针环形编号。
 */
export interface BoardState {
  spaces: SpaceState[]; // 长度固定 16
}
