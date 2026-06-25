import type { ISpell } from '../spell';
import { getTowerStack, isRavenTowerOnStack } from '../../../state/selectors';
import { RuleError, RuleErrorCode } from '../../../rule-error';
import type { GameState, Player, SpellPayload } from '../../../../../shared/src/types';
import type { EventBus } from '../../../event-bus';

export const swapTwoTowers: ISpell = {
  definition: {
    spell_id: 'SWAP_TWO_TOWERS',
    cost_full_potions: 1,
    effect_type: 'SWAP_TOWERS',
    target_rule: 'CUSTOM',
    timing_rule: 'BEFORE_DURING_AFTER_ACTION',
  },

  canCast(state: GameState, player: Player, payload: SpellPayload): void {
    const { spaceIndex1, spaceIndex2 } = payload.targetDecision ?? {};

    if (typeof spaceIndex1 !== 'number' || typeof spaceIndex2 !== 'number') {
      throw new RuleError(RuleErrorCode.INVALID_SPELL_TARGET, 'Two space indices are required.');
    }
    if (spaceIndex1 === spaceIndex2) {
      throw new RuleError(RuleErrorCode.INVALID_SPELL_TARGET, 'Cannot swap a stack with itself.');
    }

    const stack1 = getTowerStack(state, spaceIndex1);
    const stack2 = getTowerStack(state, spaceIndex2);

    if (stack1.length === 0 || stack2.length === 0) {
      throw new RuleError(RuleErrorCode.INVALID_SPELL_TARGET, 'Both selected spaces must have towers.');
    }

    // Assuming a new selector isRavenTowerOnStack is created.
    if (isRavenTowerOnStack(state, stack1) || isRavenTowerOnStack(state, stack2)) {
      throw new RuleError(RuleErrorCode.INVALID_SPELL_TARGET, 'Cannot swap a stack containing the Raven Tower.');
    }
  },

  resolve(state: GameState, player: Player, payload: SpellPayload, eventBus: EventBus): void {
    const { spaceIndex1, spaceIndex2 } = payload.targetDecision!;

    eventBus.emit({
      type: 'TOWER_STACKS_SWAPPED', // A new event type to be added
      payload: {
        spaceIndex1: spaceIndex1!,
        spaceIndex2: spaceIndex2!,
        source: 'SPELL',
      },
    });
  },
};