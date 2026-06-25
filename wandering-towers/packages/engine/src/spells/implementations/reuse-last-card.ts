import type { SpellDefinition, MovementCardDefinition } from '@wt/shared';
import { SPELL_BY_ID, RuleErrorCode, MovementCardType } from '@wt/shared';
import { TEMPLATE_BY_ID } from '@wt/shared';
import { RuleError } from '../../rule-error';
import { moveWizardExact } from '../../rules/move-wizard';
import { moveTowerSegment } from '../../rules/move-tower';
import { maybeFillOnePotionForImprisonment } from '../../rules/potion';
import type { ISpell, SpellCastContext, SpellResolveResult } from '../spell';

/**
 * REUSE_LAST_CARD（V4 §13.6 Spell-07）
 * 再次使用弃牌堆顶部的移动牌效果。chosenMode 决定按巫师牌还是塔牌结算。
 *
 * 复用 moveWizardExact / moveTowerSegment（V4 §5.2）。
 * 步数取自牌模板的 fixedValue；骰子牌不在本阶段支持（需 chosenMode + resolvedMoveValue，预留）。
 */
export const reuseLastCard: ISpell = {
  definition: SPELL_BY_ID['REUSE_LAST_CARD']! as SpellDefinition,

  canCast(ctx: SpellCastContext): void {
    const { state, payload } = ctx;
    if (state.discardPile.length === 0) {
      throw new RuleError(RuleErrorCode.INVALID_SPELL_TARGET, '弃牌堆为空，无可复用的牌');
    }
    const td = payload.targetDecision;
    const chosenMode = td?.chosenMode ?? null;
    if (chosenMode !== 'WIZARD' && chosenMode !== 'TOWER') {
      throw new RuleError(RuleErrorCode.INVALID_SPELL_TARGET, 'chosenMode 必填（WIZARD/TOWER）');
    }
    // 顶牌模板必须支持所选模式
    const topCardId = state.discardPile[state.discardPile.length - 1]!;
    const tmpl = lookupTemplate(state, topCardId);
    if (chosenMode === 'WIZARD' && tmpl.type !== MovementCardType.MOVE_WIZARD && tmpl.type !== MovementCardType.MOVE_WIZARD_OR_TOWER) {
      throw new RuleError(RuleErrorCode.INVALID_SPELL_TARGET, '顶牌不能用于移动巫师');
    }
    if (chosenMode === 'TOWER' && tmpl.type !== MovementCardType.MOVE_TOWER && tmpl.type !== MovementCardType.MOVE_WIZARD_OR_TOWER) {
      throw new RuleError(RuleErrorCode.INVALID_SPELL_TARGET, '顶牌不能用于移动塔');
    }
    if (tmpl.moveValueMode !== 'FIXED' || tmpl.fixedValue == null) {
      throw new RuleError(RuleErrorCode.INVALID_SPELL_TARGET, '骰子牌复用暂不支持');
    }
  },

  resolve(ctx: SpellCastContext): SpellResolveResult {
    const { state, player, payload, emit } = ctx;
    const td = payload.targetDecision!;
    const chosenMode = td.chosenMode!;
    const topCardId = state.discardPile[state.discardPile.length - 1]!;
    const tmpl = lookupTemplate(state, topCardId);
    const steps = tmpl.fixedValue!;

    if (chosenMode === 'WIZARD') {
      const wizardId = td.wizardId;
      if (!wizardId) {
        throw new RuleError(RuleErrorCode.INVALID_SPELL_TARGET, 'wizardId 必填');
      }
      const result = moveWizardExact(state, player.id, wizardId, steps, 'SPELL', { skipOwnerCheck: false }, emit);
      return { enteredCastle: result.enteredCastle };
    }

    // TOWER
    const sourceSpaceIndex = td.towerSourceSpaceIndex;
    const pickedTowerId = td.pickedTowerId;
    if (sourceSpaceIndex == null || !pickedTowerId) {
      throw new RuleError(RuleErrorCode.INVALID_SPELL_TARGET, 'towerSourceSpaceIndex/pickedTowerId 必填');
    }
    const result = moveTowerSegment(state, player.id, sourceSpaceIndex, pickedTowerId, steps, 'SPELL', emit);
    if (result.imprisonmentHappened) {
      maybeFillOnePotionForImprisonment(state, player.id, emit);
    }
    return { enteredCastle: false };
  },
};

/** 从 state 上的 _cardTemplates 映射反查牌模板（与 play-card.lookupCardInstance 同源） */
function lookupTemplate(state: { _cardTemplates?: Record<string, string> } | unknown, cardId: string): MovementCardDefinition {
  const map = (state as unknown as { _cardTemplates?: Record<string, string> })._cardTemplates;
  const templateId = map?.[cardId];
  if (!templateId) {
    throw new RuleError(RuleErrorCode.INVALID_SPELL_TARGET, `无牌模板: ${cardId}`);
  }
  const tmpl = TEMPLATE_BY_ID[templateId];
  if (!tmpl) {
    throw new RuleError(RuleErrorCode.INVALID_SPELL_TARGET, `未知模板: ${templateId}`);
  }
  return tmpl;
}
