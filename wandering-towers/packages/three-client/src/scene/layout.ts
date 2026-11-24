/** 场景尺度（世界单位）——与视觉原型一致 */
export const BOARD_TOP = 0.6;
export const TILE_TOP = BOARD_TOP + 0.14;
export const TOWER_LAYER = 0.56;
export const RING_RADIUS = 6.55;
export const TILE_RADIUS = 1.32;
export const SPACE_COUNT = 16;

/**
 * 棋子比例（世界单位）。
 *
 * 塔顶可用平台半径只有约 0.6，而规则允许单格最多 9 名可见巫师堆叠，
 * 因此巫师必须明显小于塔身：原 1.22 会让 3 人以上互相穿模、8 人时完全糊成
 * 一团彩色锥体。按 0.6 计算，巫师占地半径约 0.15，外圈 6 人（r≈0.44）仍有
 * 约 0.32 的弧长间隙，正好能读出“一队小人”。
 */
export const GROUND_WIZARD_SCALE = 0.66;
export const TOWER_WIZARD_SCALE = 0.6;
/** 拾取/锚点基准（未缩放），使用时乘以实际 scale */
export const WIZARD_ANCHOR_HEIGHT = 0.86;
export const WIZARD_SELECT_RADIUS = 0.34;

/** 第 index 个空间的极坐标（index 0 在正后方，顺时针增长） */
export function spacePolar(index: number, count = SPACE_COUNT): { angle: number; x: number; z: number } {
  const angle = (index / count) * Math.PI * 2 - Math.PI / 2;
  return { angle, x: Math.cos(angle) * RING_RADIUS, z: Math.sin(angle) * RING_RADIUS };
}
