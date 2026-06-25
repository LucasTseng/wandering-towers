import type { ISpell } from '../spell';
import { getRavenTower } from '../../../state/selectors';
import type { GameState, Player, SpellPayload } from '../../../../../shared/src/types';
import type { EventBus } from '../../../event-bus';

export const moveRavenCastle: ISpell = {
  definition: {
    spell_id: 'MOVE_RAVEN_CASTLE',
    cost_full_potions: 1,
    effect_type: 'MOVE_TOWER',
    target_rule: 'RAVEN_CASTLE',
    timing_rule: 'BEFORE_DURING_AFTER_ACTION',
  },

  /**
   * No specific target validation is needed from the payload for this spell.
   * The core checks (potions, spell limit) are handled by the main castSpell function.
   */
  canCast(state: GameState, player: Player, payload: SpellPayload): void {
    // No-op. The target is implicit and requires no user decision.
  },

  resolve(state: GameState, player: Player, payload: SpellPayload, eventBus: EventBus): void {
    const ravenTower = getRavenTower(state);

    eventBus.emit({
      type: 'TOWER_MOVED',
      payload: {
        towerId: ravenTower.id,
        steps: 1,
        source: 'SPELL',
      },
    });
  },
};