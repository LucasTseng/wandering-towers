import type { GameState, PlayerID, SpaceIndex, TowerID, WizardID } from '@wt/shared';
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

/** 派生单个空间的展示数据
 * 注意：被封印的巫师不出现在 groundWizards / topWizards（选择器只查可见巫师），
 * 也不在 SpaceCellData 中暴露 ID（玩家凭记忆记录被封印的巫师）。
 * `imprisonedWizards` 只暴露数量，开发模式可选使用；当前 UI 不显示该数字。
 *
 * `selectableWizardOwnerId`：V2 §8.1 颜色隔离——若指定，仅该玩家的巫师可被点。
 */
export function deriveSpaceCell(
  state: GameState,
  index: SpaceIndex,
  selectableWizardOwnerId?: PlayerID,
): SpaceCellData {
  const stack = towerStackAt(state, index); // 自下而上
  const groundIds = groundWizardsAt(state, index);
  const topIds = towerTopWizardsAt(state, index);
  const castleSpace = ravenCastleSpaceIndex(state);
  const castleOnTower = ravenCastleOnTowerId(state);
  void topTowerAt;

  const towerLayers = stack.map((towerId: TowerID) => ({
    towerId,
    hasRavenShield: state.towers[towerId]?.hasRavenShield ?? false,
    hasCastle: castleSpace === index && castleOnTower === towerId,
    imprisonedWizards: imprisonedWizardsInTower(state, towerId).length,
  }));

  return {
    spaceIndex: index,
    isRavenShieldGround: state.board.spaces[index]?.groundHasRavenShield ?? false,
    castleHere: castleSpace === index && castleOnTower === null,
    castleOnTowerId: castleSpace === index ? castleOnTower : null,
    towerLayers,
    groundWizards: groundIds.map((wid: WizardID) => ({
      wizardId: wid,
      ownerPlayerId: state.wizards[wid]?.ownerPlayerId ?? '',
    })),
    topWizards: topIds.map((wid: WizardID) => ({
      wizardId: wid,
      ownerPlayerId: state.wizards[wid]?.ownerPlayerId ?? '',
    })),
    selectableWizardOwnerId,
  };
}

/** 派生全部 16 个空间的展示数据 */
export function deriveAllSpaces(
  state: GameState,
  selectableWizardOwnerId?: PlayerID,
): SpaceCellData[] {
  return state.board.spaces.map((sp) => deriveSpaceCell(state, sp.index, selectableWizardOwnerId));
}

/** 某空间的塔堆自下而上 TowerID[]（切片选择用） */
export function getStackAt(state: GameState, index: SpaceIndex): TowerID[] {
  return towerStackAt(state, index);
}

export { topTowerAt };
