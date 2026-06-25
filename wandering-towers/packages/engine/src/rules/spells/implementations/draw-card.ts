import type { ISpell } from '../spell';
import type { GameState, Player, SpellPayload } from '../../../../../shared/src/types';
import type { EventBus } from '../../../event-bus';

export const drawCard: ISpell = {
  definition: {
    spell_id: 'DRAW_CARD',
    cost_full_potions: 1,
    effect_type: 'DRAW_CARD',
    target_rule: 'NO_TARGET',
    timing_rule: 'BEFORE_DURING_AFTER_ACTION',
    usage_scope: ['CUSTOM', 'MASTER'],
    tags: ['standard_pool', 'utility'],
    params: { count: 1 },
  },

  canCast(state: GameState, player: Player, payload: SpellPayload): void {
    // No-op. The target is implicit (the player themselves) and requires no user decision.
  },

  resolve(state: GameState, player: Player, payload: SpellPayload, eventBus: EventBus): void {
    const count = (this.definition.params as { count: number }).count;

    const cardsToDrawIds: string[] = [];
    let currentState = state;

    // Take whatever is available from the current draw pile
    const fromDrawPile = currentState.drawPile.slice(0, count);
    cardsToDrawIds.push(...fromDrawPile);

    const remainingToDraw = count - fromDrawPile.length;

    // If more are needed and discard pile has cards, trigger a reshuffle
    if (remainingToDraw > 0 && currentState.discardPile.length > 0) {
      eventBus.emit({ type: 'DISCARD_RESHUFFLED_TO_DRAW', payload: {} });

      // After reshuffle, the new draw pile is available in the accumulated state
      const stateAfterReshuffle = eventBus.getAccumulatedState();
      const fromNewDrawPile = stateAfterReshuffle.drawPile.slice(0, remainingToDraw);
      cardsToDrawIds.push(...fromNewDrawPile);
    }

    if (cardsToDrawIds.length > 0) {
      eventBus.emit({
        type: 'CARDS_DRAWN',
        payload: { playerId: player.id, cardIds: cardsToDrawIds, source: 'SPELL' },
      });
    }
  },
};