import type {
  ActionSource,
  GameEvent,
  GameState,
  PlayerID,
  SpaceIndex,
  WizardID,
  WizardState,
} from '@wt/shared';
import { RuleErrorCode, WizardStateType, VISIBLE_WIZARD_CAPACITY_PER_SPACE } from '@wt/shared';
import { RuleError } from '../rule-error';
import {
  clockwiseSpace,
  isRavenShieldPosition,
  ravenCastleSpaceIndex,
  topTowerAt,
  visibleWizardCountAt,
} from '../state/selectors';

/**
 * moveWizardExact（V4 §14.4 / V2 规则 §10-11）
 *
 * 口径：
 *  - 顺时针精确移动，必须走完步数（V2 §10.3）
 *  - 经过乌鸦城堡但步数不刚好 -> 不进堡，继续越过（V2 §11 / V4 §14.4 step 3）
 *  - 恰好落到城堡所在位置 -> 进入城堡，返回 enteredCastle=true（V4 §14.4 step 4）
 *  - 落点无塔 -> ON_GROUND；有塔 -> ON_TOWER_TOP（V2 §10.4）
 *  - 落点可见巫师上限 6（V2 §10.5 / V4 §14.4 step 5.1）
 *
 * 本函数只产生「巫师位置变化」相关事件，不处理城堡移动与回合结束
 * （由调用方 playMovementCard / castSpell 依据返回值处理）。
 *
 * @param allowAnyOwner 普通巫师牌只允许自己的可见巫师；法术可放宽（由调用方决定后传入校验结果）。
 */
export interface MoveWizardResult {
  enteredCastle: boolean;
}

export interface MoveWizardOptions {
  /** 是否允许移动任意玩家的可见巫师（法术可放宽），默认 false=仅自己 */
  allowAnyOwner?: boolean;
  /** 是否跳过「自己可见巫师」所有权校验（法术场景由调用方自行校验目标规则） */
  skipOwnerCheck?: boolean;
}

export function moveWizardExact(
  state: GameState,
  playerId: PlayerID,
  wizardId: WizardID,
  steps: number,
  source: ActionSource,
  options: MoveWizardOptions = {},
  emit: (type: GameEvent['type'], payload: unknown) => GameEvent,
): MoveWizardResult {
  const wizard = state.wizards[wizardId];
  if (!wizard) {
    throw new RuleError(RuleErrorCode.INVALID_WIZARD_TARGET, `wizard not found: ${wizardId}`);
  }

  // 1. validate wizard is visible and movable
  if (wizard.state.mode === WizardStateType.IMPRISONED || wizard.state.mode === WizardStateType.IN_CASTLE) {
    throw new RuleError(RuleErrorCode.INVALID_WIZARD_TARGET, `wizard ${wizardId} not visible (${wizard.state.mode})`);
  }
  if (!options.skipOwnerCheck) {
    const allowAny = options.allowAnyOwner ?? false;
    if (!allowAny && wizard.ownerPlayerId !== playerId) {
      throw new RuleError(
        RuleErrorCode.INVALID_WIZARD_TARGET,
        `wizard ${wizardId} not owned by ${playerId}`,
      );
    }
  }
  if (steps <= 0) {
    throw new RuleError(RuleErrorCode.INVALID_MOVE_VALUE, `steps must be > 0, got ${steps}`);
  }

  // 起点空间
  if (wizard.state.mode !== WizardStateType.ON_GROUND && wizard.state.mode !== WizardStateType.ON_TOWER_TOP) {
    // 类型守卫已保证不会到这
    throw new RuleError(RuleErrorCode.INVALID_WIZARD_TARGET);
  }
  const fromSpace = wizard.state.spaceIndex;
  const fromState: WizardState = wizard.state;

  const castleSpace = ravenCastleSpaceIndex(state);
  const spaceCount = state.board.spaces.length;

  // 2-3. 顺时针逐步前进，判断是否恰好停在城堡
  // 逐格走，检查终点是否恰好等于城堡位置（即 steps 后落点 == castleSpace）。
  const destSpace = clockwiseSpace(fromSpace, steps, spaceCount);

  // 4. 若落点恰好是乌鸦城堡 -> 进堡
  if (destSpace === castleSpace) {
    const toState: WizardState = { mode: WizardStateType.IN_CASTLE };
    emit('WIZARD_MOVED', {
      wizardId,
      from: fromState,
      to: toState,
      steps,
      source,
    });
    emit('WIZARD_ENTERED_CASTLE', { wizardId, playerId: wizard.ownerPlayerId });
    return { enteredCastle: true };
  }

  // 5.1 落点可见巫师上限检查
  if (visibleWizardCountAt(state, destSpace) >= VISIBLE_WIZARD_CAPACITY_PER_SPACE) {
    throw new RuleError(
      RuleErrorCode.TARGET_CAPACITY_EXCEEDED,
      `space ${destSpace} has 6 visible wizards`,
    );
  }

  // 5.2-5.3 移除源位置，落到目的地
  const topTower = topTowerAt(state, destSpace);
  let toState: WizardState;
  if (topTower) {
    toState = { mode: WizardStateType.ON_TOWER_TOP, spaceIndex: destSpace, topTowerId: topTower };
  } else {
    toState = { mode: WizardStateType.ON_GROUND, spaceIndex: destSpace };
  }

  emit('WIZARD_MOVED', { wizardId, from: fromState, to: toState, steps, source });
  void isRavenShieldPosition; // 保留引用以便未来扩展
  return { enteredCastle: false };
}

/** 判断某巫师是否为合法的「自己的可见巫师」目标（供 playMovementCard 校验） */
export function isOwnVisibleWizard(state: GameState, playerId: PlayerID, wizardId: WizardID): boolean {
  const w = state.wizards[wizardId];
  if (!w) return false;
  if (w.ownerPlayerId !== playerId) return false;
  return w.state.mode === WizardStateType.ON_GROUND || w.state.mode === WizardStateType.ON_TOWER_TOP;
}

export type { SpaceIndex };
