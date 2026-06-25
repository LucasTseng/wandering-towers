import type { GameEvent, GameState, SpaceIndex } from '@wt/shared';
import {
  clockwiseSpace,
  isRavenShieldPosition,
  ravenCastleOnTowerId,
  ravenCastleSpaceIndex,
  visibleWizardCountAt,
} from '../state/selectors';

/**
 * advanceRavenCastleAfterWizardEntered（V4 §14.8 / V2 规则 §12）
 *
 * 从当前城堡位置起，顺时针找下一个合法乌鸦纹章位：
 *  - 是乌鸦纹章位（地面纹章 或 带纹章塔顶）
 *  - 该位置顶层没有可见巫师（地面+塔顶均无人）
 *  - 塔内封印巫师但表面无人 -> 仍合法（V2 §12.2）
 * 找到则移动；找不到则不动。
 *
 * 返回是否移动及新位置。
 */
export interface AdvanceCastleResult {
  moved: boolean;
  newPosition: GameState['ravenCastle']['position'];
}

export function advanceRavenCastleAfterWizardEntered(
  state: GameState,
  emit: (type: GameEvent['type'], payload: unknown) => GameEvent,
): AdvanceCastleResult {
  const spaceCount = state.board.spaces.length;
  const currentSpace = ravenCastleSpaceIndex(state);
  const oldPosition = state.ravenCastle.position;
  const castleOnTower = ravenCastleOnTowerId(state);

  // 顺时针扫描所有空间（跳过当前）
  for (let off = 1; off <= spaceCount; off++) {
    const candidate = clockwiseSpace(currentSpace, off, spaceCount);
    if (!isRavenShieldPosition(state, candidate)) continue;
    // 顶层无可见巫师
    if (visibleWizardCountAt(state, candidate) > 0) continue;
    // 合法落点
    const newPosition = resolveCastlePositionAt(state, candidate);
    const fromPayload =
      oldPosition.mode === 'ON_TOWER'
        ? { mode: 'ON_TOWER', spaceIndex: oldPosition.spaceIndex, topTowerId: castleOnTower ?? undefined }
        : { mode: 'ON_SPACE', spaceIndex: oldPosition.spaceIndex };
    state.ravenCastle.position = newPosition;
    emit('RAVEN_CASTLE_MOVED', { from: fromPayload, to: newPosition });
    return { moved: true, newPosition };
  }

  // 5. 找不到 -> 不动
  return { moved: false, newPosition: oldPosition };
}

/**
 * 计算城堡落到某空间时的具体位置形态：
 *  - 该空间有塔 -> 城堡站到顶塔上（ON_TOWER）
 *  - 无塔 -> 城堡在地面（ON_SPACE）
 *
 * 注意：城堡落点已保证「无可见巫师」，但可能有塔（塔顶无人即可）。
 */
function resolveCastlePositionAt(
  state: GameState,
  spaceIndex: SpaceIndex,
): GameState['ravenCastle']['position'] {
  const sp = state.board.spaces[spaceIndex]!;
  if (sp.towerStack.length > 0) {
    const top = sp.towerStack[sp.towerStack.length - 1]!;
    return { mode: 'ON_TOWER', spaceIndex, topTowerId: top };
  }
  return { mode: 'ON_SPACE', spaceIndex };
}

export type { SpaceIndex };
