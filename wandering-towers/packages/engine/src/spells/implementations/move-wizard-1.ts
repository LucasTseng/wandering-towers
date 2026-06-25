import type { SpellDefinition } from '@wt/shared';
import { SPELL_BY_ID, RuleErrorCode, WizardStateType } from '@wt/shared';
import { RuleError } from '../../rule-error';
import { clockwiseSpace } from '../../state/selectors';
import { moveWizardExact } from '../../rules/move-wizard';
import type { ISpell, SpellCastContext, SpellResolveResult } from '../spell';

/**
 * MOVE_WIZARD_1（V4 §13.6 Spell-01）
 * 移动自己的 1 名可见巫师顺时针 1 格。复用 moveWizardExact（V4 §5.2 / TC-SPELL-005）。
 */
export const moveWizard1: ISpell = {
  definition: SPELL_BY_ID['MOVE_WIZARD_1']! as SpellDefinition,

  canCast(ctx: SpellCastContext): void {
    const { state, player, payload } = ctx;
    const td = payload.targetDecision;
    const wizardId = td?.wizardId ?? null;
    const targetSpaceIndex = td?.targetSpaceIndex ?? null;

    if (!wizardId || targetSpaceIndex == null) {
      throw new RuleError(RuleErrorCode.INVALID_SPELL_TARGET, 'wizardId 与 targetSpaceIndex 必填');
    }
    const wizard = state.wizards[wizardId];
    if (!wizard) {
      throw new RuleError(RuleErrorCode.INVALID_SPELL_TARGET, `巫师不存在: ${wizardId}`);
    }
    if (wizard.ownerPlayerId !== player.id) {
      throw new RuleError(RuleErrorCode.INVALID_SPELL_TARGET, '只能移动自己的巫师');
    }
    if (wizard.state.mode === WizardStateType.IMPRISONED || wizard.state.mode === WizardStateType.IN_CASTLE) {
      throw new RuleError(RuleErrorCode.INVALID_SPELL_TARGET, '巫师不可见，无法移动');
    }
    // 顺时针距离必须正好 1（V2 §10.2 顺时针；禁用双向最短距离）
    const fromIdx = wizard.state.mode === WizardStateType.ON_GROUND
      ? wizard.state.spaceIndex
      : wizard.state.mode === WizardStateType.ON_TOWER_TOP
        ? wizard.state.spaceIndex
        : null;
    if (fromIdx == null) {
      throw new RuleError(RuleErrorCode.INVALID_SPELL_TARGET, '巫师位置异常');
    }
    const expected = clockwiseSpace(fromIdx, 1, state.board.spaces.length);
    if (targetSpaceIndex !== expected) {
      throw new RuleError(RuleErrorCode.INVALID_SPELL_TARGET, '目标格必须顺时针 1 格');
    }
  },

  resolve(ctx: SpellCastContext): SpellResolveResult {
    const { state, player, payload, emit } = ctx;
    const wizardId = payload.targetDecision!.wizardId!;
    // skipOwnerCheck：canCast 已校验归属
    const result = moveWizardExact(state, player.id, wizardId, 1, 'SPELL', { skipOwnerCheck: true }, emit);
    return { enteredCastle: result.enteredCastle };
  },
};
