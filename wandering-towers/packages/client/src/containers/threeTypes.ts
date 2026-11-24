import type { PlayerID } from '@wt/shared';

/** 回合轮转提示（纯视觉，不阻断操作） */
export interface TurnNotice {
  key: number;
  playerId: PlayerID;
  roundNumber: number;
  color: string;
}
