import type { GameState, PlayerID, SpaceIndex, WizardID } from '@wt/shared';
import {
  groundWizardsAt,
  imprisonedWizardsInTower,
  ravenCastleOnTowerId,
  ravenCastleSpaceIndex,
  towerStackAt,
  towerTopWizardsAt,
} from '@wt/engine';
import type { SceneCell } from './types';

/**
 * 派生 3D 场景所需的 16 个地块数据。
 *
 * 与 `@wt/client/src/game/selectors.ts` 的 `deriveSpaceCell` 完全同源：
 * - 塔堆顺序、塔顶/地面可见巫师、被封印巫师数量、乌鸦城堡位置
 * - 乌鸦纹章「合法落点」口径：有塔时只看顶塔，无塔时看地面
 *
 * 被封印巫师只暴露数量，不暴露 ID（玩家凭记忆记录，和原版一致）。
 */
export function deriveSceneCell(state: GameState, index: SpaceIndex): SceneCell {
  const stack = towerStackAt(state, index);
  const castleSpace = ravenCastleSpaceIndex(state);
  const castleOnTower = ravenCastleOnTowerId(state);
  const sp = state.board.spaces[index];

  return {
    spaceIndex: index,
    groundHasRavenShield: sp?.groundHasRavenShield ?? false,
    setupCapacity: sp?.setupCapacity ?? 0,
    castleHere: castleSpace === index && castleOnTower === null,
    castleOnTowerId: castleSpace === index ? castleOnTower : null,
    towerLayers: stack.map((towerId) => ({
      towerId,
      hasRavenShield: state.towers[towerId]?.hasRavenShield ?? false,
      hasCastle: castleSpace === index && castleOnTower === towerId,
      sealed: state.towers[towerId]?.sealed ?? false,
      imprisonedWizards: imprisonedWizardsInTower(state, towerId).length,
    })),
    groundWizards: groundWizardsAt(state, index).map((wizardId) => ({
      wizardId,
      ownerPlayerId: state.wizards[wizardId]?.ownerPlayerId ?? ('' as PlayerID),
    })),
    topWizards: towerTopWizardsAt(state, index).map((wizardId) => ({
      wizardId,
      ownerPlayerId: state.wizards[wizardId]?.ownerPlayerId ?? ('' as PlayerID),
    })),
  };
}

export function deriveSceneCells(state: GameState): SceneCell[] {
  return state.board.spaces.map((sp) => deriveSceneCell(state, sp.index));
}

/** 某玩家当前可见（地面或塔顶）的巫师 ID —— 与原版 highlightableWizards 同口径 */
export function visibleWizardIdsOf(state: GameState, playerId: PlayerID): WizardID[] {
  const ids: WizardID[] = [];
  const player = state.players[playerId];
  if (!player) return ids;
  for (const wizardId of player.wizardIds) {
    const wizard = state.wizards[wizardId];
    if (!wizard) continue;
    if (wizard.state.mode === 'ON_GROUND' || wizard.state.mode === 'ON_TOWER_TOP') {
      ids.push(wizardId);
    }
  }
  return ids;
}

/** 巫师所在空间（用于高亮地面环） */
export function wizardSpaceIndexOf(state: GameState, wizardId: WizardID): SpaceIndex | null {
  const wizard = state.wizards[wizardId];
  if (!wizard) return null;
  const s = wizard.state;
  if (s.mode === 'ON_GROUND' || s.mode === 'ON_TOWER_TOP' || s.mode === 'IMPRISONED') return s.spaceIndex;
  return null;
}
