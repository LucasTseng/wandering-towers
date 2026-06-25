import type { CardID, PlayerID, PotionID, WizardID } from './ids';

/**
 * 玩家状态（V2 开发需求 §9 / V3 数据字典 §10）
 */
export interface PlayerState {
  id: PlayerID;
  /** 座位顺序，用于确定回合顺序 */
  seatIndex: number;
  color: string;
  wizardIds: WizardID[];
  potionIds: PotionID[];
  /** 当前手牌 ID 列表，正常回合结束目标为 3 */
  hand: CardID[];
  /** 当前回合已施法次数，回合开始时重置为 0 */
  spellsCastThisTurn: number;
}
