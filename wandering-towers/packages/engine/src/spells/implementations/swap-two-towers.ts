import type { SpellDefinition, WizardState } from '@wt/shared';
import { SPELL_BY_ID, RuleErrorCode, WizardStateType } from '@wt/shared';
import { RuleError } from '../../rule-error';
import type { ISpell, SpellCastContext, SpellResolveResult } from '../spell';

/**
 * SWAP_TWO_TOWERS（V4 §13.6 Spell-05）
 * 交换两个空间上的整个塔堆（含塔内封印巫师、塔顶巫师、塔上乌鸦堡）。
 * 两个空间都必须有塔。交换是位置互换，塔堆内部顺序不变。
 */
export const swapTwoTowers: ISpell = {
  definition: SPELL_BY_ID['SWAP_TWO_TOWERS']! as SpellDefinition,

  canCast(ctx: SpellCastContext): void {
    const { state, payload } = ctx;
    const s1 = payload.targetDecision?.spaceIndex1 ?? null;
    const s2 = payload.targetDecision?.spaceIndex2 ?? null;
    if (s1 == null || s2 == null) {
      throw new RuleError(RuleErrorCode.INVALID_SPELL_TARGET, 'spaceIndex1 与 spaceIndex2 必填');
    }
    if (s1 === s2) {
      throw new RuleError(RuleErrorCode.INVALID_SPELL_TARGET, '两个空间不能相同');
    }
    const sp1 = state.board.spaces[s1];
    const sp2 = state.board.spaces[s2];
    if (!sp1 || !sp2) {
      throw new RuleError(RuleErrorCode.INVALID_SPELL_TARGET, '空间越界');
    }
    if (sp1.towerStack.length === 0 || sp2.towerStack.length === 0) {
      throw new RuleError(RuleErrorCode.INVALID_SPELL_TARGET, '两个空间都必须有塔');
    }
  },

  resolve(ctx: SpellCastContext): SpellResolveResult {
    const { state, payload, emit } = ctx;
    const s1 = payload.targetDecision!.spaceIndex1!;
    const s2 = payload.targetDecision!.spaceIndex2!;
    const sp1 = state.board.spaces[s1]!;
    const sp2 = state.board.spaces[s2]!;

    // 收集两空间涉及的所有巫师（塔顶 + 塔内封印），交换后更新它们的 spaceIndex
    const collectWizards = (spaceIndex: number): string[] => {
      const ids: string[] = [];
      // 塔顶可见巫师 + 塔内封印巫师
      for (const w of Object.values(state.wizards)) {
        if (
          w.state.mode === WizardStateType.ON_TOWER_TOP &&
          w.state.spaceIndex === spaceIndex
        ) {
          ids.push(w.id);
        }
        if (w.state.mode === WizardStateType.IMPRISONED && w.state.spaceIndex === spaceIndex) {
          ids.push(w.id);
        }
      }
      return ids;
    };

    const wizards1 = collectWizards(s1);
    const wizards2 = collectWizards(s2);

    // 交换塔堆
    const tmp = sp1.towerStack;
    sp1.towerStack = sp2.towerStack;
    sp2.towerStack = tmp;

    // 更新涉及巫师的 spaceIndex（塔顶与封印巫师都跟随塔堆到新空间）
    const reassign = (ids: string[], newSpace: number): void => {
      for (const wid of ids) {
        const w = state.wizards[wid];
        if (!w) continue;
        if (w.state.mode === WizardStateType.ON_TOWER_TOP) {
          (w.state as Extract<WizardState, { mode: 'ON_TOWER_TOP' }>).spaceIndex = newSpace;
        } else if (w.state.mode === WizardStateType.IMPRISONED) {
          (w.state as Extract<WizardState, { mode: 'IMPRISONED' }>).spaceIndex = newSpace;
        }
      }
    };
    reassign(wizards1, s2);
    reassign(wizards2, s1);

    // 乌鸦堡若在两空间之一，跟随到对方空间
    const castle = state.ravenCastle;
    if (castle.position.spaceIndex === s1) {
      castle.position = { ...castle.position, spaceIndex: s2 };
    } else if (castle.position.spaceIndex === s2) {
      castle.position = { ...castle.position, spaceIndex: s1 };
    }

    emit('TOWER_STACK_REBUILT', { spaceIndex: s1, towerStack: sp1.towerStack });
    emit('TOWER_STACK_REBUILT', { spaceIndex: s2, towerStack: sp2.towerStack });
    return { enteredCastle: false };
  },
};
