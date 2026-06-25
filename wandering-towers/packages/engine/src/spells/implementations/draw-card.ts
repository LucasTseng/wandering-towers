import type { SpellDefinition } from '@wt/shared';
import { SPELL_BY_ID } from '@wt/shared';

import type { ISpell, SpellCastContext, SpellResolveResult } from '../spell';

/**
 * DRAW_CARD（V4 §13.6 Spell-06）
 * 从抽牌堆抽 1 张牌。无目标。牌堆耗尽则先洗弃牌堆再抽（V2 §21）。
 *
 * 复用 turn-flow.refillHand 的「peek 顶牌 + 牌堆空洗弃牌堆」思路，
 * 但只抽 1 张（法术效果，非补牌）。
 */
export const drawCard: ISpell = {
  definition: SPELL_BY_ID['DRAW_CARD']! as SpellDefinition,

  canCast(_ctx: SpellCastContext): void {
    // 无目标校验。即使两堆均空也无法抽 -> 由 resolve 时判定，不抽不发事件。
  },

  resolve(ctx: SpellCastContext): SpellResolveResult {
    const { state, player, emit } = ctx;

    // 牌堆不足且弃牌堆有牌 -> 先洗牌（与 refillHand 一致：reverse 确定性洗牌）
    if (state.drawPile.length === 0 && state.discardPile.length > 0) {
      emit('DISCARD_PILE_RESHUFFLED', {});
      // apply-event 会把 discardPile reverse 后 unshift 到 drawPile 前部并清空 discardPile。
      // 这里 peek 洗牌后的顶牌（尾部）。注意：apply-event 尚未执行，需本地模拟。
      const reshuffled = [...state.discardPile].reverse();
      const topId = reshuffled[reshuffled.length - 1];
      if (topId) {
        emit('CARDS_DRAWN', { playerId: player.id, cardIds: [topId] });
      }
      return { enteredCastle: false };
    }

    if (state.drawPile.length > 0) {
      const topId = state.drawPile[state.drawPile.length - 1]!;
      emit('CARDS_DRAWN', { playerId: player.id, cardIds: [topId] });
    }
    // 两堆均空 -> 无牌可抽，不发事件（法术仍消耗药水）
    return { enteredCastle: false };
  },
};
