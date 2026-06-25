import type { GameState, MovementCardDefinition, MovementCardType } from '@wt/shared';
import { MovementCardType as MCT, TEMPLATE_BY_ID } from '@wt/shared';

/** 从 state 上的 _cardTemplates 映射反查牌模板（与引擎 play-card 同源） */
export function getCardTemplate(state: GameState, cardId: string): MovementCardDefinition | undefined {
  const map = (state as unknown as { _cardTemplates?: Record<string, string> })._cardTemplates;
  const templateId = map?.[cardId];
  if (!templateId) return undefined;
  return TEMPLATE_BY_ID[templateId];
}

/** 牌类型中文 */
export function cardTypeLabel(type: MovementCardType): string {
  switch (type) {
    case MCT.MOVE_WIZARD:
      return '巫师';
    case MCT.MOVE_TOWER:
      return '塔';
    case MCT.MOVE_WIZARD_OR_TOWER:
      return '巫师/塔';
  }
}

/** 牌面展示文本 */
export function cardLabel(state: GameState, cardId: string): string {
  const tmpl = getCardTemplate(state, cardId);
  if (!tmpl) return cardId;
  const mode = tmpl.moveValueMode === 'FIXED' ? `${tmpl.fixedValue}` : '骰';
  return `${cardTypeLabel(tmpl.type)}${mode}`;
}
