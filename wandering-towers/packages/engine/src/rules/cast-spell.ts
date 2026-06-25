import { getPlayer, getPotionsByState } from '../state/selectors';
import { RuleError, RuleErrorCode } from '../rule-error';
import { getSpell } from './spells/spell-registry';
import type { EventBus } from '../event-bus';
import type { GameState, PlayerId, SpellPayload, GameEvent } from '../../../../shared/src/types';
import { advanceRavenCastleAfterWizardEntered } from './raven-castle';

/**
 * Main function to handle the CAST_SPELL command.
 * Follows the logic from V4 §14.9.
 */
export function castSpell(
  state: GameState,
  playerId: PlayerId,
  payload: SpellPayload,
  eventBus: EventBus,
): { turnEnds: boolean } {
  // 1. Validate
  const player = getPlayer(state, playerId);
  if (player.id !== state.currentPlayerId) {
    throw new RuleError(RuleErrorCode.NOT_CURRENT_PLAYER);
  }

  // 1.1 player is allowed to cast now (phase/timing check)
  // This is a simplified check. V4 §13.5 suggests more complex timing rules.
  // For now, we allow casting during the action phases. A full implementation
  // would check the spell's timing_rule against the current game context.
  if (state.turnPhase !== 'ACTION_1' && state.turnPhase !== 'ACTION_2' && state.turnPhase !== 'TURN_END') {
    // A more robust check could be here.
  }

  const spellImplementation = getSpell(payload.spellId);
  if (!spellImplementation) {
    throw new RuleError(RuleErrorCode.INVALID_SPELL_ID, `Spell ${payload.spellId} not found.`);
  }

  // 1.2 spell is in current game's availableSpells
  if (!state.availableSpells.includes(payload.spellId)) {
    throw new RuleError(RuleErrorCode.SPELL_NOT_IN_GAME, `Spell ${payload.spellId} is not available in this game.`);
  }

  // 1.4 spell usage limit this turn not exceeded
  if (player.spellsCastThisTurn >= state.config.spellSetup.maxSpellsPerTurn) {
    throw new RuleError(RuleErrorCode.SPELL_LIMIT_REACHED);
  }

  // 1.3 player has enough FULL potions
  const fullPotions = getPotionsByState(state, playerId, 'FULL');
  const cost = spellImplementation.definition.cost_full_potions;
  if (fullPotions.length < cost) {
    throw new RuleError(RuleErrorCode.NOT_ENOUGH_FULL_POTIONS);
  }

  // 1.5 target satisfies spell.target_rule (delegated to the spell implementation)
  spellImplementation.canCast(state, player, payload);

  // 2. Spend potion resources
  const potionsToSpend = fullPotions.slice(0, cost);
  eventBus.emit({
    type: 'POTION_SPENT',
    payload: {
      playerId,
      spellId: payload.spellId,
      potionIds: potionsToSpend.map(p => p.id),
    },
  });

  // 3. Emit SPELL_CAST
  eventBus.emit({
    type: 'SPELL_CAST',
    payload: {
      playerId,
      spellId: payload.spellId,
      target: payload.targetDecision,
    },
  });

  // 4. Resolve by spell.effect_type (delegated to spell implementation)
  const eventsBeforeResolve = eventBus.getEvents().length;
  spellImplementation.resolve(eventBus.getAccumulatedState(), player, payload, eventBus);
  const newEvents = eventBus.getEvents().slice(eventsBeforeResolve);

  // 6. if spell effect caused a wizard to enter raven castle
  const wizardEnteredCastleEvent = newEvents.find(
    (e: GameEvent) => e.type === 'WIZARD_ENTERED_CASTLE' && e.payload.wizard.ownerPlayerId === playerId
  );

  let turnEnds = false;
  if (wizardEnteredCastleEvent) {
    // 6.1 advanceRavenCastleAfterWizardEntered()
    advanceRavenCastleAfterWizardEntered(eventBus, eventBus.getAccumulatedState());

    // 6.2 current player's turn ends immediately
    turnEnds = true;
  }
  
  // 7. increase player's spellsCastThisTurn
  // This will be handled by the SPELL_CAST event handler in apply-event.ts

  return { turnEnds };
}