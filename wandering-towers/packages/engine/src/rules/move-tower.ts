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

  // 5. (V4 §14.5 step 6.3 + §14.6) 处理源位置解封
  // 源空间留下的塔（不在 movedSlice 中的）若有 IMPRISONED 巫师，移到该塔顶
  // （兼容历史 E1 行为：源空间留下塔的 imprisoned 解封到原空间最顶塔/地面）
  releaseVisibleWizardsAtSource(state, sourceSpaceIndex, movedSlice, emit);

  // 6. 识别随切片移动的巫师（站在切片顶部的）
  const sliceTopTower = movedSlice[movedSlice.length - 1]!;
  const wizardsOnSliceTop = Object.values(state.wizards).filter(
    (w) => w.state.mode === WizardStateType.ON_TOWER_TOP && w.state.topTowerId === sliceTopTower,
  ).map(w => w.id);

  // 7. (V4 §14.5 step 9 / Model B) 处理目标位置封印
  // Model B 封印归属（与 V2 §14.1 旧口径不同）：
  //  - 塔顶巫师（站在 dest 原顶塔上）→ 封进**被覆盖塔** originalDestTopTower（跟随该塔），sealedAs='COVERED_TOWER'
  //  - 地面巫师 → 封进**覆盖塔** coveringTowerId（movedSlice[0]），sealedAs='GROUND'
  const coveringTowerId = movedSlice[0]!; // 切片底部塔（覆盖塔），负责封印地面巫师
  const groundTargets = [...groundWizardsAt(state, destSpaceIndex)];
  const originalDestTopTower = topTowerAt(state, destSpaceIndex); // 被覆盖塔
  const topTargets = originalDestTopTower
    ? Object.values(state.wizards).filter(
        (w) => w.state.mode === WizardStateType.ON_TOWER_TOP && w.state.topTowerId === originalDestTopTower,
      ).map((w) => w.id)
    : [];
  const imprisonmentHappened = groundTargets.length + topTargets.length > 0;

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

  // 10. 发 WIZARD_IMPRISONED（Model B：塔顶→被覆盖塔 COVERED_TOWER；地面→覆盖塔 GROUND）
  for (const wizardId of topTargets) {
    emit('WIZARD_IMPRISONED', {
      wizardId,
      insideTowerId: originalDestTopTower,
      spaceIndex: destSpaceIndex,
      sealedAs: 'COVERED_TOWER',
    });
  }
  for (const wizardId of groundTargets) {
    emit('WIZARD_IMPRISONED', {
      wizardId,
      insideTowerId: coveringTowerId,
      spaceIndex: destSpaceIndex,
      sealedAs: 'GROUND',
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
 * releaseVisibleWizardsAtSource（V4 §14.6 / Model B）
 *
 * 塔切片移走后，源位置留下的塔不再被上方塔覆盖。Model B 解封规则：
 *
 * Part 1（新顶塔解封）：源空间剩余塔堆的**新顶塔 newTopTower** 重新暴露——
 *   释放其内部 sealedAs='COVERED_TOWER' 的巫师到该塔顶（ON_TOWER_TOP）。
 *   这正是「被覆盖塔重新成为顶层 → 塔内巫师解封」（用户例子第 3 步 W3 解封）。
 *   剩余塔堆中**非顶塔**（仍被埋）的 COVERED_TOWER 封印不解封。
 *   newTopTower 的 GROUND 封印不解封（地面封印只在覆盖塔移开其封印空间时解封，见 Part 2）。
 *
 * Part 2（地面封印随覆盖塔离开而解封）：切片内塔中 sealedAs='GROUND' 且
 *   spaceIndex===source 的巫师——覆盖塔移离开其封印所在空间时解封回源空间
 *   （地面巫师不跟随塔移动）。仅限 GROUND；COVERED_TOWER 封印随切片走、保持封印
 *   （用户例子第 3 步 W2 仍封印）。
 *
 * 源空间无剩余塔（newTopTower 不存在）时：Part 1 无操作；Part 2 的 GROUND 巫师解封到地面。
 *
 * 事件溯源红线：本函数只 emit WIZARD_RELEASED，不直接 mutate state。
 * 解封的实际状态变更由 applyEvent(WIZARD_RELEASED) 完成，否则纯事件回放
 * 无法复现解封，破坏 TC-REPLAY-001 一致性。
 */
function releaseVisibleWizardsAtSource(
  state: GameState,
  sourceSpaceIndex: SpaceIndex,
  movedSlice: TowerID[],
  emit: (type: GameEvent['type'], payload: unknown) => GameEvent,
): void {
  const sourceSpace = state.board.spaces[sourceSpaceIndex];
  if (!sourceSpace) return;

  const movedSet = new Set(movedSlice);
  // 源空间移走 movedSlice 后留下的塔（自下而上）；用于决定解封落点
  const remainingTowers = sourceSpace.towerStack.filter((tid) => !movedSet.has(tid));
  const newTopTower = remainingTowers[remainingTowers.length - 1];

  const toState = (): WizardState =>
    newTopTower
      ? { mode: WizardStateType.ON_TOWER_TOP, spaceIndex: sourceSpaceIndex, topTowerId: newTopTower }
      : { mode: WizardStateType.ON_GROUND, spaceIndex: sourceSpaceIndex };

  // Part 1：新顶塔的 COVERED_TOWER 封印解封
  if (newTopTower) {
    const tower = state.towers[newTopTower];
    if (tower) {
      for (const wizardId of [...tower.imprisonedWizards]) {
        const wizard = state.wizards[wizardId];
        if (!wizard || wizard.state.mode !== WizardStateType.IMPRISONED) continue;
        if (wizard.state.sealedAs !== 'COVERED_TOWER') continue;
        emit('WIZARD_RELEASED', { wizardId, to: toState() });
      }
    }
  }

  // Part 2：切片内塔的 GROUND 封印（封印于源空间）随覆盖塔离开而解封
  for (const towerId of movedSlice) {
    const tower = state.towers[towerId];
    if (!tower) continue;
    for (const wizardId of [...tower.imprisonedWizards]) {
      const wizard = state.wizards[wizardId];
      if (!wizard || wizard.state.mode !== WizardStateType.IMPRISONED) continue;
      if (wizard.state.sealedAs !== 'GROUND') continue;
      if (wizard.state.spaceIndex !== sourceSpaceIndex) continue;
      emit('WIZARD_RELEASED', { wizardId, to: toState() });
    }
  }
}

/** 工具：判断某塔是否可作为「被提起部分的底层」合法切片起点（任意塔堆内塔皆可） */
export function isValidSlicePick(state: GameState, spaceIndex: SpaceIndex, towerId: TowerID): boolean {
  const sp = state.board.spaces[spaceIndex];
  if (!sp) return false;
  return sp.towerStack.includes(towerId);
}

export { towerSpaceIndex };
