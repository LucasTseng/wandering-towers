import type { ISpell } from '../spell';
import { getWizard, getWizardsAt } from '../../../state/selectors';
import { RuleError, RuleErrorCode } from '../../../rule-error';
import { getDistanceOnCircle } from '../../../utils/math';
import type { GameState, Player, SpellPayload } from '../../../../../shared/src/types';
import type { EventBus } from '../../../event-bus';

export const moveWizard1: ISpell = {
  definition: {
    spell_id: 'MOVE_WIZARD_1',
    cost_full_potions: 1,
    effect_type: 'MOVE_WIZARD',
    target_rule: 'OWN_VISIBLE_WIZARD',
    timing_rule: 'BEFORE_DURING_AFTER_ACTION',
  },

  canCast(state: GameState, player: Player, payload: SpellPayload): void {
    const { wizardId, spaceIndex } = payload.targetDecision ?? {};

    if (typeof wizardId !== 'string' || typeof spaceIndex !== 'number') {
      throw new RuleError(RuleErrorCode.INVALID_SPELL_TARGET, 'Wizard ID and target space index are required.');
    }

    const wizard = getWizard(state, wizardId);
    if (wizard.ownerPlayerId !== player.id) {
      throw new RuleError(RuleErrorCode.INVALID_SPELL_TARGET, 'Cannot target another player\'s wizard.');
    }
    if (wizard.position.mode !== 'ON_GROUND') {
      throw new RuleError(RuleErrorCode.INVALID_SPELL_TARGET, 'Wizard must be on the ground to move.');
    }

    const distance = getDistanceOnCircle(wizard.position.spaceIndex, spaceIndex, state.board.spaces.length);
    if (distance !== 1) {
      throw new RuleError(RuleErrorCode.INVALID_SPELL_TARGET, 'Can only move exactly 1 space with this spell.');
    }

    const wizardsAtTarget = getWizardsAt(state, spaceIndex);
    if (wizardsAtTarget.some(w => w.ownerPlayerId === player.id)) {
      throw new RuleError(RuleErrorCode.INVALID_SPELL_TARGET, 'Cannot move to a space already occupied by one of your wizards.');
    }
  },

  resolve(state: GameState, player: Player, payload: SpellPayload, eventBus: EventBus): void {
    const { wizardId, spaceIndex } = payload.targetDecision!;
    const wizard = getWizard(state, wizardId!);

    eventBus.emit({
      type: 'WIZARD_MOVED',
      payload: {
        wizardId: wizardId!,
        source: 'SPELL',
        from: wizard.position,
        to: { mode: 'ON_GROUND', spaceIndex: spaceIndex! },
        steps: 1,
      },
    });
  },
};