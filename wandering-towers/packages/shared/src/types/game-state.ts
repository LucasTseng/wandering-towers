import type { GameConfig } from './game-config';
import type { PlayerID, PotionID, TowerID, WizardID, CardID, SpellID } from './ids';
import type { TurnPhase } from '../enums/turn-phase';
import type { BoardState } from './board';
import type { TowerRuntimeState } from './tower';
import type { WizardRuntime } from './wizard';
import type { Potion } from './potion';
import type { PlayerState } from './player';
import type { RavenCastleState } from './raven-castle';

/**
 * GameState 顶层结构（V2 开发需求 §14 / V3 数据字典 §14）
 */
export interface GameState {
  config: GameConfig;
  /** 当前行动玩家 */
  currentPlayerId: PlayerID;
  turnPhase: TurnPhase;
  roundNumber: number;
  board: BoardState;
  towers: Record<TowerID, TowerRuntimeState>;
  wizards: Record<WizardID, WizardRuntime>;
  potions: Record<PotionID, Potion>;
  players: Record<PlayerID, PlayerState>;
  ravenCastle: RavenCastleState;
  drawPile: CardID[]; // 数组尾部为牌堆顶
  discardPile: CardID[];
  /** 本局启用法术 ID 列表 */
  availableSpells: SpellID[];
  endgameTriggered: boolean;
  endgameTriggerPlayerId: PlayerID | null;
  endgameTriggerRound: number | null;
  /** 最终胜者（GAME_FINISHED 后填入） */
  winners: PlayerID[];
  /** 终局结算分数（剩余 FULL 药水数） */
  scores: Record<PlayerID, number>;
  /** 是否并列胜利 */
  sharedVictory: boolean;
  /** 局面版本号，每次成功结算命令 +1（V3 后端协议 §5.2） */
  stateVersion: number;
  /** 玩家座位顺序（按 seatIndex） */
  playerOrder: PlayerID[];
}
