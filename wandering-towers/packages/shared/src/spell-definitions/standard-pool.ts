import type { SpellDefinition } from '../types/spell-definition';
import type { SpellID } from '../types/ids';
import { SpellEffectType } from '../enums/spell-effect-type';
import { SpellTargetRule } from '../enums/spell-target-rule';
import { SpellTimingRule } from '../enums/spell-timing-rule';
import { SpellUsageScope } from '../enums/spell-usage-scope';

/**
 * 标准版法术定义总表（V4 §13.6）
 *
 * 共 7 张法术。建模方式（effect_type / target_rule / timing_rule / params）
 * 来自 V4，不可变；文案后续可据官方纸质资料替换。
 *
 * 标签说明（V4 §13.1）：
 * - core_basic_default：新手基础局默认启用
 * - standard_pool：标准版法术池可被启用
 * - master_only / reaction_capable：仅更高模式启用（本表未使用）
 */
export const STANDARD_SPELL_POOL: SpellDefinition[] = [
  {
    spell_id: 'MOVE_WIZARD_1',
    zh_name: '移动一名巫师',
    en_name: 'Move a Wizard',
    cost_full_potions: 1,
    effect_type: SpellEffectType.MOVE_WIZARD,
    target_rule: SpellTargetRule.OWN_VISIBLE_WIZARD,
    timing_rule: SpellTimingRule.BEFORE_DURING_AFTER_ACTION,
    usage_scope: [SpellUsageScope.BASIC, SpellUsageScope.CUSTOM, SpellUsageScope.MASTER],
    tags: ['core_basic_default', 'standard_pool'],
    params: { steps: 1 },
  },
  {
    spell_id: 'MOVE_TOWER_2',
    zh_name: '移动一座塔',
    en_name: 'Move a Tower',
    cost_full_potions: 1,
    effect_type: SpellEffectType.MOVE_TOWER,
    target_rule: SpellTargetRule.ANY_TOWER_SEGMENT,
    timing_rule: SpellTimingRule.BEFORE_DURING_AFTER_ACTION,
    usage_scope: [SpellUsageScope.BASIC, SpellUsageScope.CUSTOM, SpellUsageScope.MASTER],
    tags: ['core_basic_default', 'standard_pool'],
    params: { steps: 2 },
  },
  {
    spell_id: 'FREE_A_WIZARD',
    zh_name: '解封一名巫师',
    en_name: 'Free a Wizard',
    cost_full_potions: 1,
    effect_type: SpellEffectType.FREE_WIZARD,
    target_rule: SpellTargetRule.CUSTOM,
    timing_rule: SpellTimingRule.BEFORE_DURING_AFTER_ACTION,
    usage_scope: [SpellUsageScope.CUSTOM, SpellUsageScope.MASTER],
    tags: ['standard_pool'],
    params: { allowLookUnderTower: true, placeOnTopAfterFree: true },
  },
  {
    spell_id: 'MOVE_RAVEN_CASTLE',
    zh_name: '移动乌鸦城堡',
    en_name: 'Move the Raven Castle',
    cost_full_potions: 1,
    effect_type: SpellEffectType.MOVE_RAVEN_CASTLE,
    target_rule: SpellTargetRule.RAVEN_CASTLE,
    timing_rule: SpellTimingRule.BEFORE_DURING_AFTER_ACTION,
    usage_scope: [SpellUsageScope.CUSTOM, SpellUsageScope.MASTER],
    tags: ['standard_pool', 'reposition'],
    params: { steps: 1, followRavenShieldRule: true },
  },
  {
    spell_id: 'SWAP_TWO_TOWERS',
    zh_name: '交换两座塔',
    en_name: 'Swap Towers',
    cost_full_potions: 1,
    effect_type: SpellEffectType.SWAP_TOWERS,
    target_rule: SpellTargetRule.CUSTOM,
    timing_rule: SpellTimingRule.BEFORE_DURING_AFTER_ACTION,
    usage_scope: [SpellUsageScope.CUSTOM, SpellUsageScope.MASTER],
    tags: ['standard_pool', 'positioning'],
    params: { count: 2, moveWholeStacks: true },
  },
  {
    spell_id: 'DRAW_CARD',
    zh_name: '抽一张牌',
    en_name: 'Draw a Card',
    cost_full_potions: 1,
    effect_type: SpellEffectType.DRAW_CARD,
    target_rule: SpellTargetRule.NO_TARGET,
    timing_rule: SpellTimingRule.BEFORE_DURING_AFTER_ACTION,
    usage_scope: [SpellUsageScope.CUSTOM, SpellUsageScope.MASTER],
    tags: ['standard_pool', 'utility'],
    params: { count: 1 },
  },
  {
    spell_id: 'REUSE_LAST_CARD',
    zh_name: '再次使用上一张移动牌',
    en_name: 'Reuse Card',
    cost_full_potions: 1,
    effect_type: SpellEffectType.REUSE_CARD,
    target_rule: SpellTargetRule.NO_TARGET,
    timing_rule: SpellTimingRule.BEFORE_DURING_AFTER_ACTION,
    usage_scope: [SpellUsageScope.CUSTOM, SpellUsageScope.MASTER],
    tags: ['standard_pool', 'combo'],
    params: { reuseLastMovementCard: true },
  },
];

/** 法术 ID -> 定义 索引 */
export const SPELL_BY_ID: Readonly<Record<SpellID, SpellDefinition>> = Object.fromEntries(
  STANDARD_SPELL_POOL.map((s) => [s.spell_id, s]),
) as Readonly<Record<SpellID, SpellDefinition>>;

/** 标准法术池全部 ID */
export const STANDARD_SPELL_IDS: SpellID[] = STANDARD_SPELL_POOL.map((s) => s.spell_id);

/** 获取法术定义，不存在则抛错 */
export function getSpellDefinition(spellId: SpellID): SpellDefinition {
  const def = SPELL_BY_ID[spellId];
  if (!def) {
    throw new Error(`Unknown spell: ${spellId}`);
  }
  return def;
}
