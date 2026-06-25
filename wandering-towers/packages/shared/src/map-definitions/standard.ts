import type { SpaceIndex } from '../types/ids';
import type { TowerID } from '../types/ids';

/**
 * 地图定义（V4 §1.3 / §11.1）
 *
 * 关键口径：
 * - 道路由 4 块道路板拼成 16 格顺时针环形（V2 规则 §3.1）
 * - 开局巫师容量 = 该塔位道路上的火苗数（V2 规则 §5.3 / V4 §11.1）
 *   标准版默认分布等价于 前3位=3、中3位=2、后3位=1，但必须数据化，不写死逻辑。
 * - 9 座塔从乌鸦城堡右侧第一格起顺时针放置，第一座必须带乌鸦纹章（V2 规则 §4.3）
 * - 5 座带乌鸦纹章的塔、4 座普通塔（V2 规则 §2.1）
 *
 * 本定义把「乌鸦纹章位」「火苗容量」「塔初始位置」全部数据化，
 * 引擎据此构造棋盘，不硬编码任何 3/2/1 判断。
 */

/** 单个空间的开局静态属性 */
export interface SpaceDefinition {
  index: SpaceIndex;
  /** 该地面格是否为乌鸦纹章位（乌鸦城堡可落点候选） */
  groundHasRavenShield: boolean;
  /** 开局巫师容量（火苗数）。非塔位为 0。 */
  setupCapacity: number;
}

/** 塔的静态定义 */
export interface TowerDefinition {
  id: TowerID;
  /** 是否带乌鸦纹章 */
  hasRavenShield: boolean;
  /** 开局所在空间索引（从乌鸦城堡右侧第一格起顺时针） */
  initialSpaceIndex: SpaceIndex;
}

/** 乌鸦城堡初始位置（V2 规则 §4.2） */
export interface RavenCastleInitialPosition {
  spaceIndex: SpaceIndex;
}

export interface MapDefinition {
  /** 空间总数（标准版 = 16） */
  spaceCount: number;
  spaces: SpaceDefinition[];
  towers: TowerDefinition[];
  ravenCastleInitial: RavenCastleInitialPosition;
}

/**
 * 标准版默认地图。
 *
 * 空间编号 0~15 顺时针环形。
 * 设计约定：
 *  - space 0 = 乌鸦城堡初始位置（地面纹章位）
 *  - 9 座塔放于 space 1~9（城堡右侧第一格 = space 1 起），顺时针
 *  - 第一座塔（space 1）带乌鸦纹章
 *  - 乌鸦纹章地面位 + 带纹章塔位共同构成城堡可落点候选
 *
 * setupCapacity（火苗数）按 V2 规则 §5.3 分布：
 *   前 3 座塔位 = 3，中 3 座 = 2，后 3 座 = 1。
 * 这里以数据形式写入，引擎不写死。
 */
export const STANDARD_MAP: MapDefinition = {
  spaceCount: 16,
  spaces: buildStandardSpaces(),
  towers: buildStandardTowers(),
  ravenCastleInitial: { spaceIndex: 0 },
};

function buildStandardSpaces(): SpaceDefinition[] {
  const spaces: SpaceDefinition[] = [];
  // 9 座塔位位于 space 1~9，其 setupCapacity 按 3/3/3/2/2/2/1/1/1
  const capacityByTowerSlot = [3, 3, 3, 2, 2, 2, 1, 1, 1];
  for (let i = 0; i < 16; i++) {
    const isTowerSlot = i >= 1 && i <= 9;
    const towerSlotIndex = i - 1; // 0..8
    const setupCapacity = isTowerSlot ? capacityByTowerSlot[towerSlotIndex]! : 0;
    spaces.push({
      index: i,
      // 乌鸦纹章地面位：space 0（城堡初始位）。其余纹章由「带纹章塔」承载。
      groundHasRavenShield: i === 0,
      setupCapacity,
    });
  }
  return spaces;
}

function buildStandardTowers(): TowerDefinition[] {
  // 9 座塔，ID T01~T09。5 座带纹章、4 座普通。
  // 第一座（T01，space 1）必须带纹章（V2 规则 §4.3）。
  const ravenShieldFlags = [true, true, true, true, true, false, false, false, false];
  const towers: TowerDefinition[] = [];
  for (let t = 0; t < 9; t++) {
    const towerNum = t + 1;
    towers.push({
      id: `T0${towerNum}`,
      hasRavenShield: ravenShieldFlags[t]!,
      initialSpaceIndex: t + 1, // space 1..9
    });
  }
  return towers;
}
