import type { EventBus } from '../../event-bus';
import type {
  GameState,
  Player,
  RuleError,
  SpellDefinition,
  SpellPayload,
} from '../../../../shared/src/types';

/**
 * The interface for a spell implementation.
 */
export interface ISpell {
  /**
   * The definition of the spell.
   */
  definition: SpellDefinition;

  /**
   * Validates if the spell can be cast in the current context.
   * Throws a RuleError if the conditions are not met.
   * @param state The current game state.
   * @param player The player attempting to cast the spell.
   * @param payload The payload of the CAST_SPELL command.
   */
  canCast(state: GameState, player: Player, payload: SpellPayload): void | RuleError;

  /**
   * Resolves the spell's effects by emitting game events.
   * This function should be pure and not modify the state directly.
   * @param state The current game state.
   * @param player The player casting the spell.
   * @param payload The payload of the CAST_SPELL command.
   * @param eventBus The event bus to emit events to.
   */
  resolve(
    state: GameState,
    player: Player,
    payload: SpellPayload,
    eventBus: EventBus,
  ): void;
}