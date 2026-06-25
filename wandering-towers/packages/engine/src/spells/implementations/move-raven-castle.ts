import type { SpellDefinition } from '@wt/shared';
import { SPELL_BY_ID } from '@wt/shared';
import { advanceRavenCastleAfterWizardEntered } from '../../rules/raven-castle';
import type { ISpell, SpellCastContext, SpellResolveResult } from '../spell';

/**
 * MOVE_RAVEN_CASTLE（V4 §13.6 Spell-04）
 * 将乌鸦城堡顺时针移动到下一个合法乌鸦纹章位。无目标。
 * 复用 advanceRavenCastleAfterWizardEntered 的落点逻辑（V2 §12）。
 */
export const moveRavenCastle: ISpell = {
  definition: SPELL_BY_ID['MOVE_RAVEN_CASTLE']! as SpellDefinition,

  canCast(_ctx: SpellCastContext): void {
    // 无目标校验；城堡是否能找到下一合法位由 resolve 时的实际局面决定，
    // 找不到则原地不动（V2 §12.3），不视为施法失败。
  },

  resolve(ctx: SpellCastContext): SpellResolveResult {
    const { state, emit } = ctx;
    advanceRavenCastleAfterWizardEntered(state, emit);
    return { enteredCastle: false };
  },
};
