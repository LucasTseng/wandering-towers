import type { CardID, CommandID, GameID, PlayerID, SpellID, TowerID, WizardID } from './ids';
import type { CommandType } from '../enums/command-type';

/** 出牌决策（V2 开发需求 §21.2 / V3 数据字典 §16） */
export interface PlayCardDecision {
  cardId: CardID;
  /** 仅 MOVE_WIZARD_OR_TOWER 牌需要 */
  chosenMode?: 'WIZARD' | 'TOWER';
  /** 骰子牌结算后的最终步数（服务端掷骰则客户端无需传） */
  resolvedMoveValue?: number;
  wizardId?: WizardID | null;
  towerSourceSpaceIndex?: number | null;
  pickedTowerId?: TowerID | null;
}

/** 弃牌重抽 payload（V3 数据字典 §17 / V3 后端协议 §10） */
export interface DiscardRedrawPayload {
  moveTowerAfterRedraw: boolean;
  towerSourceSpaceIndex?: number | null;
  pickedTowerId?: TowerID | null;
}

/** 法术目标决策（V3 数据字典 §18 / V3 后端协议 §11） */
export interface SpellTargetDecision {
  wizardId?: WizardID | null;
  towerSourceSpaceIndex?: number | null;
  pickedTowerId?: TowerID | null;
  /** SWAP_TOWERS 等需要第二目标时使用 */
  secondTowerSourceSpaceIndex?: number | null;
  secondPickedTowerId?: TowerID | null;
}

export interface CastSpellPayload {
  spellId: SpellID;
  targetDecision: SpellTargetDecision;
}

/** SKIP_SECOND_ACTION payload（V3 后端协议 §12） */
export interface SkipSecondActionPayload {
  discardCardId: CardID;
}

/**
 * 命令 payload 联合（按 CommandType 区分）
 */
export type CommandPayload =
  | PlayCardDecision
  | DiscardRedrawPayload
  | CastSpellPayload
  | SkipSecondActionPayload
  | { diceRollId?: string } // CHOOSE_DICE_RESULT
  | Record<string, never>; // END_TURN

/**
 * 统一命令（V3 数据字典 §15 / V3 后端协议 §7）
 */
export interface ActionCommand {
  commandId: CommandID;
  gameId?: GameID;
  playerId: PlayerID;
  type: CommandType;
  payload: CommandPayload;
  /** 客户端认为当前局面版本号（联机用，Phase 5） */
  expectedStateVersion?: number;
}
