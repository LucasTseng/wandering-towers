import type { SpaceIndex, TowerID, WizardID } from './ids';

/**
 * 乌鸦城堡位置（V2 开发需求 §10.1 / V3 数据字典 §11.2）
 * 两种互斥形态：在地面 / 在塔顶。
 */
export type RavenCastlePosition =
  | { mode: 'ON_SPACE'; spaceIndex: SpaceIndex }
  | { mode: 'ON_TOWER'; spaceIndex: SpaceIndex; topTowerId: TowerID };

/**
 * 乌鸦城堡状态（V2 开发需求 §10.2 / V3 数据字典 §11.1）
 */
export interface RavenCastleState {
  position: RavenCastlePosition;
  /** 已进入城堡的巫师 ID 列表 */
  wizardIdsInside: WizardID[];
}
