import type { PlayerID, SpaceIndex, TowerID, WizardID } from '@wt/shared';

/**
 * 场景层数据契约
 *
 * 与 `@wt/client` 的 `SpaceCellData` 语义一致（同一套引擎选择器派生），
 * 但只保留 3D 场景需要的最小字段：几何摆位由 SceneController 负责，
 * 这里不做任何规则判断。
 */
export interface SceneTowerLayer {
  towerId: TowerID;
  hasRavenShield: boolean;
  hasCastle: boolean;
  sealed: boolean;
  imprisonedWizards: number;
}

export interface SceneWizardRef {
  wizardId: WizardID;
  ownerPlayerId: PlayerID;
}

export interface SceneCell {
  spaceIndex: SpaceIndex;
  /** 地面是否印有乌鸦纹章（静态地图属性） */
  groundHasRavenShield: boolean;
  /** 开局容量（火苗数），0 表示非塔位 */
  setupCapacity: number;
  /** 乌鸦城堡是否直接立在此地块上 */
  castleHere: boolean;
  /** 乌鸦城堡是否压在此地块的某座塔顶 */
  castleOnTowerId: TowerID | null;
  /** 塔堆，自下而上 */
  towerLayers: SceneTowerLayer[];
  groundWizards: SceneWizardRef[];
  topWizards: SceneWizardRef[];
}

/** 一帧的交互态（纯展示，不参与规则） */
export interface StageInteraction {
  /** 可在场景中点击的巫师（颜色隔离后的己方可见巫师） */
  highlightWizards: ReadonlySet<WizardID>;
  /** 有任意合法意义的可选地块（绿环） */
  selectableSpaces: ReadonlySet<SpaceIndex>;
  /** 当前首选目标地块（金环） */
  targetSpaces: ReadonlySet<SpaceIndex>;
  onWizardClick?: ((wizardId: WizardID) => void) | undefined;
  onTowerClick?: ((spaceIndex: SpaceIndex, towerId: TowerID) => void) | undefined;
  onSpaceClick?: ((spaceIndex: SpaceIndex) => void) | undefined;
  onCastleClick?: ((spaceIndex: SpaceIndex) => void) | undefined;
}

export const EMPTY_INTERACTION: StageInteraction = {
  highlightWizards: new Set(),
  selectableSpaces: new Set(),
  targetSpaces: new Set(),
};
