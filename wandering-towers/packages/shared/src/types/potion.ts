import type { PlayerID, PotionID } from './ids';
import type { PotionState } from '../enums/potion-state';

/**
 * 药水（V2 开发需求 §8 / V3 数据字典 §9）
 * 生命周期单向：EMPTY -> FULL -> SPENT，不可逆。
 */
export interface Potion {
  id: PotionID;
  ownerPlayerId: PlayerID;
  state: PotionState;
}
