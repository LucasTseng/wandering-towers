import type { ISpell } from '../spell';
import { RuleError, RuleErrorCode } from '../../../rule-error';
import type { GameState, Player, SpellPayload } from '../../../../../shared/src/types';
import type { EventBus } from '../../../event-bus';
import { getCardTemplateByInstanceId } from '../../../state/selectors';
import { moveWizardExact } from '../../move-wizard';
import { moveTowerSegment } from '../../move-tower';

export const reuseLastCard: ISpell = {
  definition: {
    spell_id: 'REUSE_LAST_CARD',
    cost_full_potions: 1,
    effect_type: 'REUSE_CARD',
    target_rule: 'NO_TARGET', // The target is implicit, but the decision is custom.
    timing_rule: 'BEFORE_DURING_AFTER_ACTION',
    usage_scope: ['CUSTOM', 'MASTER'],
    tags: ['standard_pool', 'combo'],
    params: { reuseLastMovementCard: true },
  },

  canCast(state: GameState, player: Player, payload: SpellPayload): void {
    if (state.discardPile.length === 0) {
      throw new RuleError(RuleErrorCode.INVALID_SPELL_TARGET, 'Discard pile is empty, no card to reuse.');
    }

    if (!payload.targetDecision) {
      throw new RuleError(RuleErrorCode.INVALID_SPELL_TARGET, 'Target decision for the reused card is required.');
    }
  },

  resolve(state: GameState, player: Player, payload: SpellPayload, eventBus: EventBus): void {
    const lastCardId = state.discardPile[state.discardPile.length - 1];
    // Assumes a selector exists to get a card template from an instance ID.
    const cardTemplate = getCardTemplateByInstanceId(state, lastCardId);

    if (!cardTemplate) {
      // This should be an impossible state if the discard pile is not empty.
      throw new Error(`Critical: Could not find template for card instance ${lastCardId}`);
    }

    const { targetDecision } = payload;
    const { chosenMode, resolvedMoveValue, wizardId, towerSourceSpaceIndex, pickedTowerId } = targetDecision!;

    let moveValue: number;
    if (cardTemplate.moveValueMode === 'FIXED') {
      moveValue = cardTemplate.fixedValue!;
    } else { // DICE
      if (typeof resolvedMoveValue !== 'number' || resolvedMoveValue < 1 || resolvedMoveValue > 6) {
        throw new RuleError(RuleErrorCode.INVALID_MOVE_VALUE, 'A valid dice roll result (1-6) is required for this card.');
      }
      moveValue = resolvedMoveValue;
    }

    let effectiveMode = cardTemplate.type;
    if (cardTemplate.type === 'MOVE_WIZARD_OR_TOWER') {
      if (!chosenMode || (chosenMode !== 'MOVE_WIZARD' && chosenMode !== 'MOVE_TOWER')) {
        throw new RuleError(RuleErrorCode.INVALID_SPELL_TARGET, 'Must choose between MOVE_WIZARD or MOVE_TOWER mode.');
      }
      effectiveMode = chosenMode;
    }

    if (effectiveMode === 'MOVE_WIZARD') {
      if (!wizardId) {
        throw new RuleError(RuleErrorCode.INVALID_SPELL_TARGET, 'Wizard ID is required to reuse a wizard movement card.');
      }
      // Delegate to the core move-wizard logic from Phase 1, assuming it handles validation and event emission.
      moveWizardExact(state, player.id, wizardId, moveValue, 'SPELL', eventBus);
    } else if (effectiveMode === 'MOVE_TOWER') {
      if (typeof towerSourceSpaceIndex !== 'number' || !pickedTowerId) {
        throw new RuleError(RuleErrorCode.INVALID_SPELL_TARGET, 'Tower source space and picked tower ID are required.');
      }
      // Delegate to the core move-tower logic from Phase 1.
      moveTowerSegment(state, player.id, towerSourceSpaceIndex, pickedTowerId, moveValue, 'SPELL', eventBus);
    }
  },
};