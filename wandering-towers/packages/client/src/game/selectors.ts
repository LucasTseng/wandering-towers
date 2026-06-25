import type { GameState, SpaceIndex, TowerID, WizardID } from '@wt/shared';
import {
  towerStackAt,
  groundWizardsAt,
  towerTopWizardsAt,
  imprisonedWizardsInTower,
  ravenCastleSpaceIndex,
  ravenCastleOnTowerId,
  topTowerAt,
} from '@wt/engine';
import type { SpaceCellData } from '../components/Space';

/** 派生单个空间的展示数据 */
export function deriveSpaceCell(state: GameState, index: SpaceIndex): SpaceCellData {
  const stack = towerStackAt(state, index); // 自下而上
  const groundIds = groundWizardsAt(state, index);
  const topIds = towerTopWizardsAt(state, index);
  const castleSpace = ravenCastleSpaceIndex(state);
  const castleOnTower = ravenCastleOnTowerId(state);
  const topTower = topTowerAt(state, index);

  const towerLayers = stack.map((towerId: TowerID) => ({
    towerId,
    hasRavenShield: state.towers[towerId]?.hasRavenShield ?? false,
    hasCastle: castleSpace === index && castleOnTower === towerId,
    imprisonedWizardIds: imprisonedWizardsInTower(state, towerId),
  }));

  return {
    spaceIndex: index,
    isRavenShieldGround: state.board.spaces[index]?.groundHasRavenShield ?? false,
    castleHere: castleSpace === index && castleOnTower === null,
    towerLayers,
    groundWizards: groundIds.map((wid: WizardID) => ({
      wizardId: wid,
      ownerPlayerId: state.wizards[wid]?.ownerPlayerId ?? '',
    })),
    topWizards: topIds.map((wid: WizardID) => ({
      wizardId: wid,
      ownerPlayerId: state.wizards[wid]?.ownerPlayerId ?? '',
    })),
  };
}

/** 派生全部 16 个空间的展示数据 */
export function deriveAllSpaces(state: GameState): SpaceCellData[] {
  return state.board.spaces.map((sp) => deriveSpaceCell(state, sp.index));
}

/** 某空间的塔堆自下而上 TowerID[]（切片选择用） */
export function getStackAt(state: GameState, index: SpaceIndex): TowerID[] {
  return towerStackAt(state, index);
}

export { topTowerAt };
