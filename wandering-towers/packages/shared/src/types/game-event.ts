import type { EventID, GameID, PlayerID } from './ids';
import type { EventType } from '../enums/event-type';
import type { ActionSource } from '../enums/action-source';
import type { PotionState } from '../enums/potion-state';
import type { WizardState } from './wizard';

/**
 * 游戏事件（V3 数据字典 §19 / V3 后端协议 §6）
 * 所有状态变化都拆成事件，便于回放、断线重连、日志、AI 复盘。
 *
 * sequence：单调递增，由引擎分配。
 * actorPlayerId：触发该事件的玩家。
 */
export interface GameEvent<P = unknown> {
  eventId: EventID;
  gameId?: GameID | undefined;
  sequence: number;
  type: EventType;
  actorPlayerId?: PlayerID | undefined;
  payload: P;
}

/* ---------- 各事件 payload 示例（V3 数据字典 §21） ---------- */

export interface TurnStartedPayload {
  playerId: PlayerID;
  roundNumber: number;
}
export interface ActionPhaseChangedPayload {
  from: string;
  to: string;
}
export interface TurnEndedPayload {
  playerId: PlayerID;
  roundNumber: number;
}
export interface RoundEndedPayload {
  roundNumber: number;
}

export interface CardPlayedPayload {
  playerId: PlayerID;
  cardId: string;
  templateId: string;
  chosenMode?: 'WIZARD' | 'TOWER';
  resolvedMoveValue?: number;
}
export interface CardDiscardedPayload {
  playerId: PlayerID;
  cardId: string;
  templateId: string;
}
export interface CardsDrawnPayload {
  playerId: PlayerID;
  cardIds: string[];
}
export interface DiscardReshuffledToDrawPayload {
  playerId: PlayerID;
  count: number;
}

export interface WizardMovedPayload {
  wizardId: string;
  from: WizardState | null;
  to: WizardState;
  steps: number;
  source: ActionSource;
}
export interface WizardEnteredCastlePayload {
  wizardId: string;
  playerId: PlayerID;
}
export interface WizardImprisonedPayload {
  wizardId: string;
  insideTowerId: string;
  spaceIndex: number;
}
export interface WizardReleasedPayload {
  wizardId: string;
  to: WizardState;
}

export interface TowerSliceMovedPayload {
  movedTowerIds: string[]; // 自下而上
  fromSpaceIndex: number;
  toSpaceIndex: number;
  steps: number;
  source: ActionSource;
}
export interface TowerStackRebuiltPayload {
  spaceIndex: number;
  towerStack: string[];
}

export interface RavenCastleMovedPayload {
  from: { mode: 'ON_SPACE' | 'ON_TOWER'; spaceIndex: number; topTowerId?: string } | null;
  to: { mode: 'ON_SPACE' | 'ON_TOWER'; spaceIndex: number; topTowerId?: string };
}

export interface PotionFilledPayload {
  playerId: PlayerID;
  potionId: string;
  from: PotionState;
  to: PotionState;
  reason: 'IMPRISONMENT_REWARD';
}
export interface PotionSpentPayload {
  playerId: PlayerID;
  spellId: string;
  potionIds: string[];
}

export interface SpellCastPayload {
  playerId: PlayerID;
  spellId: string;
  targetDecision: unknown;
}

export interface EndgameTriggeredPayload {
  playerId: PlayerID;
  roundNumber: number;
}
export interface WinnerDeterminedPayload {
  winners: PlayerID[];
  fullPotionCounts: Record<PlayerID, number>;
  shared: boolean;
}

export interface InitCompletedPayload {
  config: unknown;
  startingPlayerId: PlayerID;
}
