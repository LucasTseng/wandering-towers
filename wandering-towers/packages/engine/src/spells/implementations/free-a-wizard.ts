import type { SpellDefinition, WizardState } from '@wt/shared';
import { SPELL_BY_ID, RuleErrorCode, WizardStateType } from '@wt/shared';
import { RuleError } from '../../rule-error';
import { topTowerAt } from '../../state/selectors';
import type { ISpell, SpellCastContext, SpellResolveResult } from '../spell';

/**
 * FREE_A_WIZARD（V4 §13.6 Spell-03 / §13.7）
 * 即时解封一名被封印的巫师，将其放到所在塔的塔顶（可见）。
 * 可在行动前/中/后使用（V4 §13.7 强制口径）。
 *
 * 注意：此法术不"移动"巫师，只改状态 IMPRISONED -> ON_TOWER_TOP（同空间、同塔）。
 */
export const freeAWizard: ISpell = {
  definition: SPELL_BY_ID['FREE_A_WIZARD']! as SpellDefinition,

  canCast(ctx: SpellCastContext): void {
    const { state, payload } = ctx;
    const wizardId = payload.targetDecision?.imprisonedWizardId ?? null;
    if (!wizardId) {
      throw new RuleError(RuleErrorCode.INVALID_SPELL_TARGET, 'imprisonedWizardId 必填');
    }
    const wizard = state.wizards[wizardId];
    if (!wizard) {
      throw new RuleError(RuleErrorCode.INVALID_SPELL_TARGET, `巫师不存在: ${wizardId}`);
    }
    if (wizard.state.mode !== WizardStateType.IMPRISONED) {
      throw new RuleError(RuleErrorCode.INVALID_SPELL_TARGET, '目标巫师未被封印');
    }
  },

  resolve(ctx: SpellCastContext): SpellResolveResult {
    const { state, payload, emit } = ctx;
    const wizardId = payload.targetDecision!.imprisonedWizardId!;
    const wizard = state.wizards[wizardId]!;
    // 封印状态必为 IMPRISONED（canCast 已校验）
    const imprisoned = wizard.state as Extract<WizardState, { mode: 'IMPRISONED' }>;
    const spaceIndex = imprisoned.spaceIndex;
    const insideTowerId = imprisoned.insideTowerId;
    const tower = state.towers[insideTowerId];

    // 从塔的封印登记中移除
    if (tower) {
      const i = tower.imprisonedWizards.indexOf(wizardId);
      if (i >= 0) tower.imprisonedWizards.splice(i, 1);
    }

    // 放到该塔塔顶（塔仍在该空间；若塔已被移走则落到地面）
    const topTower = topTowerAt(state, spaceIndex);
    const to: WizardState = topTower
      ? { mode: WizardStateType.ON_TOWER_TOP, spaceIndex, topTowerId: topTower }
      : { mode: WizardStateType.ON_GROUND, spaceIndex };
    wizard.state = to;

    emit('WIZARD_RELEASED', { wizardId, to });
    return { enteredCastle: false };
  },
};
