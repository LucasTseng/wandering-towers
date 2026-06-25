import type { GameState, PlayerID } from '@wt/shared';

/**
 * The result of resolving the next turn.
 */
export interface NextTurnResult {
  /** The ID of the player whose turn is next. */
  nextPlayerId: PlayerID;
  /** The round number for the next turn. */
  nextRoundNumber: number;
  /** Indicates if the next turn starts a new round. */
  isNewRound: boolean;
}

/**
 * Resolves the next player and round based on the current game state.
 * 玩家顺序由 state.playerOrder（按 seatIndex 排序）决定。
 *
 * @param state The current game state.
 * @returns An object containing the next player's ID, the next round number, and a flag indicating if it's a new round.
 */
export function resolveNextTurn(state: GameState): NextTurnResult {
  const players = state.playerOrder;
  const currentPlayerIndex = players.indexOf(state.currentPlayerId);
  if (currentPlayerIndex === -1) {
    throw new Error(
      `Could not find current player with ID ${state.currentPlayerId} in playerOrder.`,
    );
  }
  const nextPlayerIndex = (currentPlayerIndex + 1) % players.length;
  const nextPlayerId = players[nextPlayerIndex]!;

  // 新一轮：回到座位 0 的玩家
  const isNewRound = nextPlayerIndex === 0;
  const nextRoundNumber = isNewRound ? state.roundNumber + 1 : state.roundNumber;

  return { nextPlayerId, nextRoundNumber, isNewRound };
}