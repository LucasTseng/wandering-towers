/**
 * 巫师状态（V2 开发需求 §4 / V3 数据字典 §3.3 / V4 §10.2）
 *
 * - ON_GROUND：站在地面
 * - ON_TOWER_TOP：站在某座塔顶
 * - IMPRISONED：被封印在塔内（系统术语统一为「封印」，枚举名沿用数据字典）
 * - IN_CASTLE：已进入乌鸦城堡
 */
export const WizardStateType = {
  ON_GROUND: 'ON_GROUND',
  ON_TOWER_TOP: 'ON_TOWER_TOP',
  IMPRISONED: 'IMPRISONED',
  IN_CASTLE: 'IN_CASTLE',
} as const;

export type WizardStateType = (typeof WizardStateType)[keyof typeof WizardStateType];
