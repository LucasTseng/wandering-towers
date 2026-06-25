import type { SpellID } from './ids';
import type { SpellEffectType } from '../enums/spell-effect-type';
import type { SpellTargetRule } from '../enums/spell-target-rule';
import type { SpellTimingRule } from '../enums/spell-timing-rule';
import type { SpellUsageScope } from '../enums/spell-usage-scope';

/**
 * 法术定义（V4 §13.2 / V3 数据字典 §13）
 * 静态配置层：法术 ID、名称、费用、目标规则、结算时机、效果类型、参数。
 *
 * cost_full_potions：施法需要消耗的满瓶数。
 * usage_scope：声明可用于 BASIC / CUSTOM / MASTER 的范围。
 * tags：附加标签，如 core_basic_default / standard_pool。
 * params：结算参数（如 steps、count、allowLookUnderTower 等）。
 */
export interface SpellDefinition {
  spell_id: SpellID;
  zh_name: string;
  en_name: string;
  cost_full_potions: number;
  effect_type: SpellEffectType;
  target_rule: SpellTargetRule;
  timing_rule: SpellTimingRule;
  usage_scope: SpellUsageScope[];
  tags: string[];
  params: Record<string, unknown>;
}
