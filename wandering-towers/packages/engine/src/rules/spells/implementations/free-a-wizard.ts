import type { ISpell } from '../spell';
import { getWizard, getTowerStack } from '../../../state/selectors';
import { RuleError, RuleErrorCode } from '../../../rule-error';
import type { GameState, Player, SpellPayload, WizardPosition } from '../../../../../shared/src/types';
import type { EventBus } from '../../../event-bus';

export const freeAWizard: ISpell = {
  definition: {
    spell_id: 'FREE_A_WIZARD',
    cost_full_potions: 1,
    effect_type: 'FREE_WIZARD',
    target_rule: 'CUSTOM', // Custom logic is in canCast
    timing_rule: 'BEFORE_DURING_AFTER_ACTION',
  },

  canCast(state: GameState, player: Player, payload: SpellPayload): void {
    const { wizardId } = payload.targetDecision ?? {};

    if (typeof wizardId !== 'string') {
      throw new RuleError(RuleErrorCode.INVALID_SPELL_TARGET, 'Wizard ID is required.');
    }

    const wizard = getWizard(state, wizardId);
    if (wizard.ownerPlayerId !== player.id) {
      throw new RuleError(RuleErrorCode.INVALID_SPELL_TARGET, 'Can only free your own wizard.');
    }

    if (wizard.position.mode !== 'IMPRISONED') {
      throw new RuleError(RuleErrorCode.INVALID_SPELL_TARGET, 'Wizard is not imprisoned.');
    }
  },

  resolve(state: GameState, player: Player, payload: SpellPayload, eventBus: EventBus): void {
    const { wizardId } = payload.targetDecision!;
    const wizard = getWizard(state, wizardId!);
    const fromPosition = wizard.position;

    // Determine the new position based on the spell's effect.
    // V4 §13.6 params: { "placeOnTopAfterFree": true }
    const towerStack = getTowerStack(state, fromPosition.spaceIndex);
    const topTower = towerStack.length > 0 ? towerStack[towerStack.length - 1] : undefined;

    let toPosition: WizardPosition;
    if (topTower) {
      toPosition = {
        mode: 'ON_TOWER_TOP',
        spaceIndex: fromPosition.spaceIndex,
        topTowerId: topTower.id,
      };
    } else {
      // This case should be rare if a wizard is imprisoned, but as a fallback:
      toPosition = { mode: 'ON_GROUND', spaceIndex: fromPosition.spaceIndex };
    }

    eventBus.emit({
      type: 'WIZARD_RELEASED',
      payload: {
        wizardId: wizardId!,
        source: 'SPELL',
        from: fromPosition,
        to: toPosition,
      },
    });
  },
};