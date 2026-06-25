import type { ISpell } from '../spell';
import { getTower } from '../../../state/selectors';
import { RuleError, RuleErrorCode } from '../../../rule-error';
import type { GameState, Player, SpellPayload } from '../../../../../shared/src/types';
import type { EventBus } from '../../../event-bus';

export const moveTower2: ISpell = {
  definition: {
    spell_id: 'MOVE_TOWER_2',
    cost_full_potions: 1,
    effect_type: 'MOVE_TOWER',
    target_rule: 'ANY_TOWER',
    timing_rule: 'BEFORE_DURING_AFTER_ACTION',
  },

  canCast(state: GameState, player: Player, payload: SpellPayload): void {
    const { towerId, steps } = payload.targetDecision ?? {};

    if (typeof towerId !== 'string' || typeof steps !== 'number') {
      throw new RuleError(RuleErrorCode.INVALID_SPELL_TARGET, 'Tower ID and steps are required.');
    }

    if (steps !== 1 && steps !== 2) {
      throw new RuleError(RuleErrorCode.INVALID_SPELL_TARGET, 'Can only move a tower 1 or 2 steps with this spell.');
    }

    const tower = getTower(state, towerId);
    if (tower.isRavenTower) {
      throw new RuleError(RuleErrorCode.INVALID_SPELL_TARGET, 'Cannot move the Raven Tower with this spell.');
    }
  },

  resolve(state: GameState, player: Player, payload: SpellPayload, eventBus: EventBus): void {
    const { towerId, steps } = payload.targetDecision!;

    eventBus.emit({
      type: 'TOWER_MOVED',
      payload: {
        towerId: towerId!,
        steps: steps!,
        source: 'SPELL',
      },
    });
  },
};