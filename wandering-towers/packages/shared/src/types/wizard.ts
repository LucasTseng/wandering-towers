import type { SpaceIndex, TowerID, WizardID, PlayerID } from './ids';
import type { WizardStateType } from '../enums/wizard-state';

/**
 * 巫师状态（V2 开发需求 §7 / V3 数据字典 §8.2）
 * 四种互斥形态，按 mode 区分。
 */
export type WizardState =
  | { mode: 'ON_GROUND'; spaceIndex: SpaceIndex }
  | { mode: 'ON_TOWER_TOP'; spaceIndex: SpaceIndex; topTowerId: TowerID }
  | { mode: 'IMPRISONED'; spaceIndex: SpaceIndex; insideTowerId: TowerID }
  | { mode: 'IN_CASTLE' };

/**
 * 巫师运行时（V2 开发需求 §7 / V3 数据字典 §8.1）
 */
export interface WizardRuntime {
  id: WizardID;
  ownerPlayerId: PlayerID;
  state: WizardState;
}

/** 巫师是否为「可见巫师」（地面或塔顶）— V2 规则 §10.1 */
export function isVisibleWizard(w: WizardRuntime): boolean {
  return w.state.mode === 'ON_GROUND' || w.state.mode === 'ON_TOWER_TOP';
}

/** 巫师当前所在空间索引（IN_CASTLE 时为 null） */
export function wizardSpaceIndex(w: WizardRuntime): SpaceIndex | null {
  switch (w.state.mode) {
    case 'ON_GROUND':
    case 'ON_TOWER_TOP':
    case 'IMPRISONED':
      return w.state.spaceIndex;
    case 'IN_CASTLE':
      return null;
  }
}

export type { WizardStateType };
