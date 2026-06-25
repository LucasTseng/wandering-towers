import type { ActionCommand, GameEvent, GameState, CardID } from '@wt/shared';
import { RuleErrorCode, TurnPhase, TARGET_HAND_SIZE } from '@wt/shared';
import { RuleError } from '../rule-error';
import { refillHand } from './turn-flow';
import { moveTowerSegment } from './move-tower';
import type { DiscardRedrawPayload } from '@wt/shared';

/**
 * 弃 3 重抽模式（V2 规则 §7.2 / V4 TC-TURN-003/004）
 *
 * 流程：
 *  1. 弃掉手中全部牌（应为 3 张）
 *  2. 抽 3 张新牌
 *  3. 可选执行一次 moveTower(1)
 *  4. 直接结束回合（不再执行 ACTION_1/ACTION_2）
 *
 * 此路径与正常打牌路径互斥，仅在 ACTION_1 阶段可选。
 */
export interface DiscardRedrawOutcome {
  endTurn: boolean;
}

export function discardRedraw(
  state: GameState,
  command: ActionCommand,
  emit: (type: GameEvent['type'], payload: unknown) => GameEvent,
): DiscardRedrawOutcome {
  const playerId = command.playerId;
  if (state.currentPlayerId !== playerId) {
    throw new RuleError(RuleErrorCode.NOT_CURRENT_PLAYER);
  }
  if (state.turnPhase !== TurnPhase.ACTION_1) {
    throw new RuleError(RuleErrorCode.INVALID_PHASE, `discard-redraw only in ACTION_1, got ${state.turnPhase}`);
  }

  // 1. 弃掉手中全部牌
  const player = state.players[playerId]!;
  const handCopy = [...player.hand];
  for (const cardId of handCopy) {
    emit('CARD_DISCARDED', { playerId, cardId, templateId: lookupTemplate(state, cardId) });
  }

  // 2. 抽 3 张新牌
  let potentialDrawPile = [...state.drawPile];
  if (potentialDrawPile.length < TARGET_HAND_SIZE && state.discardPile.length > 0) {
    emit('DISCARD_PILE_RESHUFFLED', {});
    potentialDrawPile = [...[...state.discardPile].reverse(), ...potentialDrawPile];
  }
  const drawn = potentialDrawPile.slice(-TARGET_HAND_SIZE).reverse();
  if (drawn.length > 0) {
    emit('CARDS_DRAWN', { playerId, cardIds: drawn as CardID[] });
  }

  // 3. 可选移动塔 1 格
  const payload = command.payload as DiscardRedrawPayload;
  if (payload.moveTowerAfterRedraw) {
    if (payload.towerSourceSpaceIndex == null || !payload.pickedTowerId) {
      throw new RuleError(RuleErrorCode.INVALID_TOWER_TARGET, 'tower target required when moveTowerAfterRedraw=true');
    }
    const result = moveTowerSegment(
      state,
      playerId,
      payload.towerSourceSpaceIndex,
      payload.pickedTowerId,
      1,
      'DISCARD_REDRAW_TOWER_BONUS',
      emit,
    );
    if (result.imprisonmentHappened) {
      maybeFillOnePotionForImprisonment(state, playerId, emit);
    }
  }

  // 4. 直接结束回合
  emit('ACTION_PHASE_CHANGED', { from: state.turnPhase, to: TurnPhase.TURN_END });
  return { endTurn: true };
}

/** SKIP_SECOND_ACTION（V3 后端协议 §12 / TC-TURN-002） */
export function skipSecondAction(
  state: GameState,
  command: ActionCommand,
  emit: (type: GameEvent['type'], payload: unknown) => GameEvent,
): { endTurn: boolean } {
  const playerId = command.playerId;
  if (state.currentPlayerId !== playerId) {
    throw new RuleError(RuleErrorCode.NOT_CURRENT_PLAYER);
  }
  if (state.turnPhase !== TurnPhase.ACTION_2) {
    throw new RuleError(RuleErrorCode.INVALID_PHASE, `skip second action only in ACTION_2, got ${state.turnPhase}`);
  }
  const payload = command.payload as { discardCardId: string };
  if (!payload.discardCardId || !state.players[playerId]!.hand.includes(payload.discardCardId)) {
    throw new RuleError(RuleErrorCode.CARD_NOT_IN_HAND, `discardCardId ${payload.discardCardId} not in hand`);
  }
  emit('CARD_DISCARDED', { playerId, cardId: payload.discardCardId, templateId: lookupTemplate(state, payload.discardCardId) });
  emit('ACTION_PHASE_CHANGED', { from: state.turnPhase, to: TurnPhase.TURN_END });
  return { endTurn: true };
}

function lookupTemplate(state: GameState, cardId: string): string {
  const map = (state as unknown as { _cardTemplates?: Record<string, string> })._cardTemplates;
  return map?.[cardId] ?? 'UNKNOWN';
}

function maybeFillOnePotionForImprisonment(
  state: GameState,
  playerId: string,
  emit: (type: GameEvent['type'], payload: unknown) => GameEvent,
): void {
  const player = state.players[playerId];
  if (!player) return;
  const emptyPotionId = player.potionIds.find((pid) => state.potions[pid]?.state === 'EMPTY');
  if (!emptyPotionId) return;
  emit('POTION_FILLED', {
    playerId,
    potionId: emptyPotionId,
    reason: 'IMPRISONMENT_REWARD',
  });
}

export type { GameEvent };
