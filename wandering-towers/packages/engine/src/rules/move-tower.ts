import type {
  ActionSource,
  GameEvent,
  GameState,
  PlayerID,
  SpaceIndex,
  TowerID,
  WizardID,
  WizardState,
} from '@wt/shared';
import { RuleErrorCode, WizardStateType } from '@wt/shared';
import { RuleError } from '../rule-error';
import {
  clockwiseSpace,
  groundWizardsAt,
  ravenCastleOnTowerId,
  ravenCastleSpaceIndex,
  topTowerAt,
  towerSpaceIndex,
  towerTopWizardsAt,
} from '../state/selectors';

/**
 * moveTowerSegment（V4 §14.5 / V2 规则 §13）
 *
 * 流程（保持 V4 §14.5 语义顺序）：
 *  1. 校验 pickedTowerId 位于 sourceSpaceIndex
 *  2. 切出 pickedTowerId 及其上方所有塔
 *  3. 计算目标位置（顺时针 steps 格）
 *  4. 校验落点合法（不能把塔压到乌鸦城堡上，除非城堡在该切片上）
 *  5. 从源塔堆切出移动切片
 *  6. 重建源塔堆与可见状态（解封被暴露的巫师）
 *  7. 切片落到目标（叠到已有塔堆顶）
 *  8. 处理目标封印（新覆盖的可见巫师）
 *  9. 封印奖励 1 瓶
 *  10. 乌鸦城堡若站在切片内塔上 -> 随切片移动
 *  11. 发 TOWER_SLICE_MOVED
 *
 * 返回 imprisonmentHappened，由调用方决定是否额外发药水事件。
 */
export interface MoveTowerResult {
  imprisonmentHappened: boolean;
  ravenCastleMovedWithSlice: boolean;
  movedSliceTowerIds: TowerID[];
  fromSpaceIndex: SpaceIndex;
  toSpaceIndex: SpaceIndex;
}

export function moveTowerSegment(
  state: GameState,
  playerId: PlayerID,
  sourceSpaceIndex: SpaceIndex,
  pickedTowerId: TowerID,
  steps: number,
  source: ActionSource,
  emit: (type: GameEvent['type'], payload: unknown) => GameEvent,
): MoveTowerResult {
  const sourceSpace = state.board.spaces[sourceSpaceIndex];
  if (!sourceSpace) {
    throw new RuleError(RuleErrorCode.INVALID_TOWER_TARGET, `source space out of range: ${sourceSpaceIndex}`);
  }

  // 1. 校验 pickedTowerId 位于 sourceSpaceIndex
  const stack = sourceSpace.towerStack;
  const pickedIndex = stack.indexOf(pickedTowerId);
  if (pickedIndex < 0) {
    throw new RuleError(
      RuleErrorCode.INVALID_TOWER_TARGET,
      `tower ${pickedTowerId} not in space ${sourceSpaceIndex}`,
    );
  }
  if (steps <= 0) {
    throw new RuleError(RuleErrorCode.INVALID_MOVE_VALUE, `steps must be > 0, got ${steps}`);
  }

  // 2. 切出 pickedTowerId 及其上方所有塔
  const movedSlice = stack.slice(pickedIndex); // 自下而上 [picked, ...top]
  const remainingStack = stack.slice(0, pickedIndex); // 源塔堆保留部分

  const spaceCount = state.board.spaces.length;
  const destSpaceIndex = clockwiseSpace(sourceSpaceIndex, steps, spaceCount);

  // 4. 校验落点合法：不能把塔压到乌鸦城堡上（除非城堡在该切片上）
  const castleSpace = ravenCastleSpaceIndex(state);
  const castleOnTower = ravenCastleOnTowerId(state);
  const castleOnMovedSlice = castleOnTower !== null && movedSlice.includes(castleOnTower);
  if (destSpaceIndex === castleSpace && !castleOnMovedSlice) {
    throw new RuleError(
      RuleErrorCode.TOWER_CANNOT_LAND_ON_CASTLE,
      `cannot land tower on raven castle at space ${castleSpace}`,
    );
  }

  // 校验切片内是否有塔被封印
  for (const towerId of movedSlice) {
    const tower = state.towers[towerId];
    if (tower?.sealed) {
      throw new RuleError(RuleErrorCode.TOWER_IS_SEALED, `cannot move slice containing sealed tower ${towerId}`);
    }
  }

  // 5. (V4 §14.5 step 6.3) 处理源位置解封（当前模型下为 no-op）
  releaseVisibleWizardsAtSource(state, sourceSpaceIndex, emit);

  // 6. 识别随切片移动的巫师（站在切片顶部的）
  const sliceTopTower = movedSlice[movedSlice.length - 1]!;
  const wizardsOnSliceTop = Object.values(state.wizards).filter(
    (w) => w.state.mode === WizardStateType.ON_TOWER_TOP && w.state.topTowerId === sliceTopTower,
  ).map(w => w.id);

  // 7. (V4 §14.5 step 9) 处理目标位置封印
  const coveringTowerId = movedSlice[0]!; // 切片底部塔负责封印
  const groundTargets = [...groundWizardsAt(state, destSpaceIndex)];
  const originalDestTopTower = topTowerAt(state, destSpaceIndex);
  const topTargets = originalDestTopTower
    ? Object.values(state.wizards).filter(
        (w) => w.state.mode === WizardStateType.ON_TOWER_TOP && w.state.topTowerId === originalDestTopTower,
      ).map((w) => w.id)
    : [];
  const allCoveredWizards: WizardID[] = [...groundTargets, ...topTargets];
  const imprisonmentHappened = allCoveredWizards.length > 0;

  // 8. (V4 §14.5 step 11) 乌鸦城堡若站在切片内塔上 -> 随切片移动
  let ravenCastleMovedWithSlice = false;
  let newCastlePosition: GameState['ravenCastle']['position'] | null = null;
  if (castleOnMovedSlice && castleOnTower) {
    newCastlePosition = { mode: 'ON_TOWER', spaceIndex: destSpaceIndex, topTowerId: castleOnTower };
    ravenCastleMovedWithSlice = true;
  }

  // --- 事件发射 ---

  // 9. (V4 §14.5 step 12) 发 TOWER_SLICE_MOVED
  emit('TOWER_SLICE_MOVED', {
    movedTowerIds: movedSlice,
    fromSpaceIndex: sourceSpaceIndex,
    toSpaceIndex: destSpaceIndex,
    steps,
    source,
    wizardsOnTop: wizardsOnSliceTop,
  });

  // 10. 发 WIZARD_IMPRISONED
  for (const wizardId of allCoveredWizards) {
    emit('WIZARD_IMPRISONED', {
      wizardId,
      insideTowerId: coveringTowerId,
      spaceIndex: destSpaceIndex,
    });
  }

  // 11. 发 RAVEN_CASTLE_MOVED
  if (ravenCastleMovedWithSlice && newCastlePosition) {
    emit('RAVEN_CASTLE_MOVED', {
      from: state.ravenCastle.position,
      to: newCastlePosition,
    });
  }

  return {
    imprisonmentHappened,
    ravenCastleMovedWithSlice,
    movedSliceTowerIds: movedSlice,
    fromSpaceIndex: sourceSpaceIndex,
    toSpaceIndex: destSpaceIndex,
  };
}

/**
 * releaseVisibleWizardsAtSource（V4 §14.6）
 *
 * 在标准数据模型下，封印巫师始终附属于某座塔（insideTowerId），
 * 塔切片移走时封印巫师已随塔带走（更新 spaceIndex）。
 * 因此「源位置解封」在本模型下为 no-op：不存在「塔走了但巫师留下暴露」的情况——
 * 巫师要么随封印塔走，要么本就可见。
 *
 * 真正的解封由 FREE_A_WIZARD 法术（Phase 2）显式触发。
 * 此函数保留以对齐 V4 伪代码结构，便于未来模型调整。
 */
function releaseVisibleWizardsAtSource(
  _state: GameState,
  _sourceSpaceIndex: SpaceIndex,
  _emit: (type: GameEvent['type'], payload: unknown) => GameEvent,
): void {
  // 标准 no-op
}

/** 工具：判断某塔是否可作为「被提起部分的底层」合法切片起点（任意塔堆内塔皆可） */
export function isValidSlicePick(state: GameState, spaceIndex: SpaceIndex, towerId: TowerID): boolean {
  const sp = state.board.spaces[spaceIndex];
  if (!sp) return false;
  return sp.towerStack.includes(towerId);
}

export { towerSpaceIndex };
