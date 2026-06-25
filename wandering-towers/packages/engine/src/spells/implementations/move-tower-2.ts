import type { SpellDefinition } from '@wt/shared';
import { SPELL_BY_ID, RuleErrorCode } from '@wt/shared';
import { RuleError } from '../../rule-error';
import { moveTowerSegment } from '../../rules/move-tower';
import { maybeFillOnePotionForImprisonment } from '../../rules/potion';
import type { ISpell, SpellCastContext, SpellResolveResult } from '../spell';

/**
 * MOVE_TOWER_2（V4 §13.6 Spell-02）
 * 移动任意一座塔（切片）顺时针 1 或 2 格。复用 moveTowerSegment（V4 §5.2 / TC-SPELL-006）。
 * steps 由 targetDecision.steps 指定（1 或 2）；封印成功奖励 1 瓶（与塔牌一致）。
 */
export const moveTower2: ISpell = {
  definition: SPELL_BY_ID['MOVE_TOWER_2']! as SpellDefinition,

  canCast(ctx: SpellCastContext): void {
    const { state, payload } = ctx;
    const td = payload.targetDecision;
    const sourceSpaceIndex = td?.towerSourceSpaceIndex ?? null;
    const pickedTowerId = td?.pickedTowerId ?? null;
    const steps = td?.steps ?? null;

    if (sourceSpaceIndex == null || !pickedTowerId || steps == null) {
      throw new RuleError(RuleErrorCode.INVALID_SPELL_TARGET, 'towerSourceSpaceIndex/pickedTowerId/steps 必填');
    }
    if (steps !== 1 && steps !== 2) {
      throw new RuleError(RuleErrorCode.INVALID_SPELL_TARGET, '步数只能 1 或 2');
    }
    const stack = state.board.spaces[sourceSpaceIndex]?.towerStack ?? [];
    if (!stack.includes(pickedTowerId)) {
      throw new RuleError(RuleErrorCode.INVALID_TOWER_TARGET, `塔 ${pickedTowerId} 不在空间 ${sourceSpaceIndex}`);
    }
    // 乌鸦堡若在切片上则由 moveTowerSegment 处理（随塔走，合法）；
    // 不能把塔压到乌鸦堡上 -> moveTowerSegment 内部校验。
  },

  resolve(ctx: SpellCastContext): SpellResolveResult {
    const { state, player, payload, emit } = ctx;
    const td = payload.targetDecision!;
    const result = moveTowerSegment(
      state,
      player.id,
      td.towerSourceSpaceIndex!,
      td.pickedTowerId!,
      td.steps!,
      'SPELL',
      emit,
    );
    // 封印奖励 1 瓶（与塔牌一致，V2 §14.2）
    if (result.imprisonmentHappened) {
      maybeFillOnePotionForImprisonment(state, player.id, emit);
    }
    // 塔移动不会直接让巫师进堡（进堡只由巫师移动触发）
    return { enteredCastle: false };
  },
};
