import type { SpaceIndex, TowerID, WizardID, PlayerID } from './ids';
import type { WizardStateType } from '../enums/wizard-state';

/**
 * 巫师状态（V2 开发需求 §7 / V3 数据字典 §8.2）
 * 四种互斥形态，按 mode 区分。
 */
export type WizardState =
  | { mode: 'ON_GROUND'; spaceIndex: SpaceIndex }
  | { mode: 'ON_TOWER_TOP'; spaceIndex: SpaceIndex; topTowerId: TowerID }
  | {
      mode: 'IMPRISONED';
      spaceIndex: SpaceIndex;
      insideTowerId: TowerID;
      /**
       * 封印归属类型（Model B）：
       * - COVERED_TOWER：巫师原站在某塔顶，被覆盖后封进**该被覆盖塔**，跟随该塔；
       *   该塔重新成为塔堆顶层时（其上覆盖塔被移走）自动解封回该塔顶。
       * - GROUND：巫师原在地面，被覆盖塔 landing 后封进**覆盖塔**；
       *   覆盖塔移离开其封印所在空间时自动解封回地面/源空间。
       */
      sealedAs: 'COVERED_TOWER' | 'GROUND';
    }
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
