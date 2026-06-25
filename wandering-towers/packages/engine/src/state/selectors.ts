import type {
  GameState,
  PlayerID,
  PotionID,
  PotionState,
  SpaceIndex,
  TowerID,
  WizardID,
  WizardRuntime,
} from '@wt/shared';
import { PotionState as PotionStateEnum, WizardStateType } from '@wt/shared';

/**
 * 状态查询 helper（V4 §14.6 实现建议：运行时维护清晰的封印归属关系）
 *
 * 这些函数是纯查询，不修改状态。规则函数据此判断目标合法性、可见性、容量等。
 */

/** 取某空间的塔堆（自下而上），可能为空 */
export function towerStackAt(state: GameState, spaceIndex: SpaceIndex): TowerID[] {
  return space(state, spaceIndex).towerStack;
}

/** 某空间的顶塔 ID（无塔返回 null） */
export function topTowerAt(state: GameState, spaceIndex: SpaceIndex): TowerID | null {
  const stack = towerStackAt(state, spaceIndex);
  return stack.length > 0 ? stack[stack.length - 1]! : null;
}

/** 某空间地面上的可见巫师 */
export function groundWizardsAt(state: GameState, spaceIndex: SpaceIndex): WizardID[] {
  return space(state, spaceIndex).groundVisibleWizards;
}

/** 某空间塔顶上的可见巫师（站在顶塔上的） */
export function towerTopWizardsAt(state: GameState, spaceIndex: SpaceIndex): WizardID[] {
  const top = topTowerAt(state, spaceIndex);
  if (!top) return [];
  return Object.values(state.wizards).filter(
    (w) => w.state.mode === WizardStateType.ON_TOWER_TOP && w.state.spaceIndex === spaceIndex && w.state.topTowerId === top,
  ).map((w) => w.id);
}

/** 某空间所有可见巫师（地面 + 塔顶） */
export function visibleWizardsAt(state: GameState, spaceIndex: SpaceIndex): WizardID[] {
  return [...groundWizardsAt(state, spaceIndex), ...towerTopWizardsAt(state, spaceIndex)];
}

/** 某空间的可见巫师总数（用于 6 上限检查） */
export function visibleWizardCountAt(state: GameState, spaceIndex: SpaceIndex): number {
  return visibleWizardsAt(state, spaceIndex).length;
}

/** 某座塔内封印的巫师列表 */
export function imprisonedWizardsInTower(state: GameState, towerId: TowerID): WizardID[] {
  return state.towers[towerId]?.imprisonedWizards ?? [];
}

/** 某座塔当前所在空间索引（找不到返回 null） */
export function towerSpaceIndex(state: GameState, towerId: TowerID): SpaceIndex | null {
  for (const s of state.board.spaces) {
    if (s.towerStack.includes(towerId)) return s.index;
  }
  return null;
}

/** 某玩家的巫师是否站在指定塔顶上（ON_TOWER_TOP 且 topTowerId 匹配） */
export function isWizardOnTower(state: GameState, playerId: PlayerID, towerId: TowerID): boolean {
  return Object.values(state.wizards).some(
    (w) =>
      w.ownerPlayerId === playerId &&
      w.state.mode === WizardStateType.ON_TOWER_TOP &&
      w.state.topTowerId === towerId,
  );
}

/** 巫师是否可见（地面或塔顶） */
export function isWizardVisible(w: WizardRuntime): boolean {
  return w.state.mode === WizardStateType.ON_GROUND || w.state.mode === WizardStateType.ON_TOWER_TOP;
}

/** 取某玩家所有巫师 */
export function wizardsOfPlayer(state: GameState, playerId: PlayerID): WizardRuntime[] {
  return Object.values(state.wizards).filter((w) => w.ownerPlayerId === playerId);
}

/** 取某玩家处于指定状态的药水 ID 列表 */
export function potionsByState(
  state: GameState,
  playerId: PlayerID,
  potionState: PotionState,
): PotionID[] {
  const player = state.players[playerId];
  if (!player) return [];
  return player.potionIds.filter((pid: PotionID) => state.potions[pid]?.state === potionState);
}

/** 统计某玩家指定状态药水数 */
export function countPotions(state: GameState, playerId: PlayerID, potionState: PotionState): number {
  return potionsByState(state, playerId, potionState).length;
}

/** 某玩家是否所有巫师都已进入城堡 */
export function allWizardsInCastle(state: GameState, playerId: PlayerID): boolean {
  const wizards = wizardsOfPlayer(state, playerId);
  return wizards.length > 0 && wizards.every((w) => w.state.mode === WizardStateType.IN_CASTLE);
}

/** 乌鸦城堡当前所在空间索引 */
export function ravenCastleSpaceIndex(state: GameState): SpaceIndex {
  return state.ravenCastle.position.spaceIndex;
}

/** 乌鸦城堡是否站在某座塔顶 */
export function ravenCastleOnTowerId(state: GameState): TowerID | null {
  return state.ravenCastle.position.mode === 'ON_TOWER' ? state.ravenCastle.position.topTowerId : null;
}

/** 顺时针步进空间索引（环形 16 格） */
export function clockwiseSpace(spaceIndex: SpaceIndex, steps: number, spaceCount = 16): SpaceIndex {
  const n = ((spaceIndex + steps) % spaceCount + spaceCount) % spaceCount;
  return n;
}

/** 判断某空间是否为乌鸦城堡可落点候选（地面纹章位 或 带纹章塔顶） */
export function isRavenShieldPosition(state: GameState, spaceIndex: SpaceIndex): boolean {
  const sp = space(state, spaceIndex);
  if (sp.groundHasRavenShield) return true;
  const top = topTowerAt(state, spaceIndex);
  if (top && state.towers[top]?.hasRavenShield) return true;
  return false;
}

/** 安全取空间（越界抛错） */
function space(state: GameState, spaceIndex: SpaceIndex) {
  const sp = state.board.spaces[spaceIndex];
  if (!sp) {
    throw new Error(`Space index out of range: ${spaceIndex}`);
  }
  return sp;
}

/** 重新导出枚举以便引擎内统一引用 */
export { PotionStateEnum as PotionState };
