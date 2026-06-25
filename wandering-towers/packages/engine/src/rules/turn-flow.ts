import type { CardID, GameEvent, GameState, PlayerID, TurnPhase } from '@wt/shared';
import { INITIAL_HAND_SIZE, TARGET_HAND_SIZE, TurnPhase as TurnPhaseEnum } from '@wt/shared';
import { resolveNextTurn } from './turn-resolver';

/**
 * 玩家补牌到 TARGET_HAND_SIZE。
 * 此函数是纯粹的，它只计算需要发生什么，并发出事件。
 * 它通过 "窥视" 牌堆来确定将要抽到的牌。
 */
export function refillHand(
  state: GameState,
  playerId: PlayerID,
  emit: (type: GameEvent['type'], payload: unknown) => GameEvent,
): void {
  const player = state.players[playerId];
  if (!player) return;

  const cardsToDrawCount = TARGET_HAND_SIZE - player.hand.length;
  if (cardsToDrawCount <= 0) return;

  let potentialDrawPile = [...state.drawPile];
  if (potentialDrawPile.length < cardsToDrawCount && state.discardPile.length > 0) {
    emit('DISCARD_PILE_RESHUFFLED', {});
    // The rule function knows the deterministic reshuffle logic (reverse)
    potentialDrawPile = [...[...state.discardPile].reverse(), ...potentialDrawPile];
  }

  const drawn = potentialDrawPile.slice(-cardsToDrawCount).reverse();

  if (drawn.length > 0) {
    emit('CARDS_DRAWN', { playerId, cardIds: drawn });
  }
}

/**
 * 回合结束清理：补牌 + 重置施法计数 + 推进到下一玩家 / 下一轮 / 终局结算。
 *
 * 返回是否触发了终局最终结算。
 */
export function endTurnCleanup(
  state: GameState,
  emit: (type: GameEvent['type'], payload: unknown) => GameEvent,
): { gameFinished: boolean } {
  const currentPlayerId = state.currentPlayerId;
  const player = state.players[currentPlayerId];

  if (player) {
    // 补牌
    refillHand(state, currentPlayerId, emit);
    // 重置回合内计数器
    emit('PLAYER_TURN_STATS_RESET', { playerId: currentPlayerId });
  }

  emit('TURN_ENDED', { playerId: currentPlayerId, roundNumber: state.roundNumber });

  // 推进到下一玩家 / 下一轮
  const { nextPlayerId, nextRoundNumber, isNewRound } = resolveNextTurn(state);

  if (isNewRound) {
    emit('ROUND_ENDED', { roundNumber: state.roundNumber });
    // 若终局已触发 -> 本轮结束，由 rule-engine 准备结算胜负
    if (state.endgameTriggered) {
      // finalizeWinners 在 rule-engine 层调用；这里仅置位
      return { gameFinished: true };
    }
  }

  // 新回合开始，发出相应事件，由 applyEvent 更新状态
  emit('TURN_STARTED', { playerId: nextPlayerId, roundNumber: nextRoundNumber });
  emit('ACTION_PHASE_CHANGED', { from: state.turnPhase, to: 'ACTION_1' });
  return { gameFinished: false };
}

export interface ActionOutcome {
  endTurn: boolean;
  endgameTriggered?: boolean;
}

/**
 * 推进回合阶段：ACTION_1 -> ACTION_2；ACTION_2 -> 回合结束
 * 这是一个标准的行动收尾逻辑。
 */
export function advanceOrEndTurn(
  state: GameState,
  emit: (type: GameEvent['type'], payload: unknown) => GameEvent,
): ActionOutcome {
  if (state.turnPhase === TurnPhaseEnum.ACTION_1) {
    emit('ACTION_PHASE_CHANGED', { from: state.turnPhase, to: TurnPhaseEnum.ACTION_2 });
    return { endTurn: false, endgameTriggered: false };
  }
  // ACTION_2 -> 回合结束
  emit('ACTION_PHASE_CHANGED', { from: state.turnPhase, to: TurnPhaseEnum.TURN_END });
  return { endTurn: true, endgameTriggered: false };
}

export type { GameEvent, PlayerID, TurnPhase };
export { INITIAL_HAND_SIZE };
