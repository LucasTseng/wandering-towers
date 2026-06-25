import type { MovementCardDefinition } from '../types/movement-card';
import { MovementCardType } from '../enums/movement-card-type';
import { MOVEMENT_CARD_TOTAL } from '../constants/player-resources';

/**
 * 移动牌模板定义（V2 规则 §8-9 / V3 数据字典 §12）
 *
 * 三类牌：
 *  - MOVE_WIZARD：巫师牌（数字牌 + 骰子牌）
 *  - MOVE_TOWER：塔牌（数字牌 + 骰子牌）
 *  - MOVE_WIZARD_OR_TOWER：二选一牌（数字牌 + 骰子牌）
 *
 * 步数：固定数字牌的步数即牌面数字，必须精确走完（V2 规则 §9.1）。
 * 骰子牌：掷骰决定步数，可重掷 maxRerolls 次，最终接受最后结果（§9.2）。
 *
 * 文档未给出 90 张的精确分布，此处按合理标准组合定义模板，
 * 并由 deck-builder 据模板生成 90 张实例。模板可后续据官方牌表替换。
 */

export const MOVEMENT_CARD_TEMPLATES: MovementCardDefinition[] = [
  // 巫师牌 — 固定步数 1~6
  { templateId: 'W_FIX_1', type: MovementCardType.MOVE_WIZARD, moveValueMode: 'FIXED', fixedValue: 1 },
  { templateId: 'W_FIX_2', type: MovementCardType.MOVE_WIZARD, moveValueMode: 'FIXED', fixedValue: 2 },
  { templateId: 'W_FIX_3', type: MovementCardType.MOVE_WIZARD, moveValueMode: 'FIXED', fixedValue: 3 },
  { templateId: 'W_FIX_4', type: MovementCardType.MOVE_WIZARD, moveValueMode: 'FIXED', fixedValue: 4 },
  { templateId: 'W_FIX_5', type: MovementCardType.MOVE_WIZARD, moveValueMode: 'FIXED', fixedValue: 5 },
  { templateId: 'W_FIX_6', type: MovementCardType.MOVE_WIZARD, moveValueMode: 'FIXED', fixedValue: 6 },
  // 巫师牌 — 骰子牌
  { templateId: 'W_DICE_1', type: MovementCardType.MOVE_WIZARD, moveValueMode: 'DICE', maxRerolls: 1 },

  // 塔牌 — 固定步数 1~6
  { templateId: 'T_FIX_1', type: MovementCardType.MOVE_TOWER, moveValueMode: 'FIXED', fixedValue: 1 },
  { templateId: 'T_FIX_2', type: MovementCardType.MOVE_TOWER, moveValueMode: 'FIXED', fixedValue: 2 },
  { templateId: 'T_FIX_3', type: MovementCardType.MOVE_TOWER, moveValueMode: 'FIXED', fixedValue: 3 },
  { templateId: 'T_FIX_4', type: MovementCardType.MOVE_TOWER, moveValueMode: 'FIXED', fixedValue: 4 },
  { templateId: 'T_FIX_5', type: MovementCardType.MOVE_TOWER, moveValueMode: 'FIXED', fixedValue: 5 },
  { templateId: 'T_FIX_6', type: MovementCardType.MOVE_TOWER, moveValueMode: 'FIXED', fixedValue: 6 },
  // 塔牌 — 骰子牌
  { templateId: 'T_DICE_2', type: MovementCardType.MOVE_TOWER, moveValueMode: 'DICE', maxRerolls: 2 },

  // 二选一牌 — 固定步数
  { templateId: 'O_FIX_1', type: MovementCardType.MOVE_WIZARD_OR_TOWER, moveValueMode: 'FIXED', fixedValue: 1 },
  { templateId: 'O_FIX_2', type: MovementCardType.MOVE_WIZARD_OR_TOWER, moveValueMode: 'FIXED', fixedValue: 2 },
  { templateId: 'O_FIX_3', type: MovementCardType.MOVE_WIZARD_OR_TOWER, moveValueMode: 'FIXED', fixedValue: 3 },
  // 二选一牌 — 骰子牌
  { templateId: 'O_DICE_1', type: MovementCardType.MOVE_WIZARD_OR_TOWER, moveValueMode: 'DICE', maxRerolls: 1 },
];

/**
 * 各模板在 90 张牌堆中的张数。
 * 合计 = 90（MOVEMENT_CARD_TOTAL）。
 * 分布可后续据官方牌表校准。
 */
export const TEMPLATE_QUANTITIES: Record<string, number> = {
  W_FIX_1: 6,
  W_FIX_2: 6,
  W_FIX_3: 5,
  W_FIX_4: 5,
  W_FIX_5: 4,
  W_FIX_6: 4,
  W_DICE_1: 4,
  T_FIX_1: 6,
  T_FIX_2: 6,
  T_FIX_3: 5,
  T_FIX_4: 5,
  T_FIX_5: 4,
  T_FIX_6: 4,
  T_DICE_2: 4,
  O_FIX_1: 6,
  O_FIX_2: 6,
  O_FIX_3: 6,
  O_DICE_1: 4,
};

/** 校验：模板张数合计应为 MOVEMENT_CARD_TOTAL */
export function assertDeckTotal(): void {
  const total = Object.values(TEMPLATE_QUANTITIES).reduce((a, b) => a + b, 0);
  if (total !== MOVEMENT_CARD_TOTAL) {
    throw new Error(`Movement card deck total ${total} !== ${MOVEMENT_CARD_TOTAL}`);
  }
}

/** 模板 ID -> 定义 索引 */
export const TEMPLATE_BY_ID: Readonly<Record<string, MovementCardDefinition>> = Object.fromEntries(
  MOVEMENT_CARD_TEMPLATES.map((t) => [t.templateId, t]),
);
