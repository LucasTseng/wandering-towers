import type { SpellID } from '@wt/shared';
import type { ISpell } from './spell';
import { allSpells } from './implementations';

/**
 * 法术注册中心（V4 §12.1 第二层调度）
 *
 * 模块加载时自动注册全部标准版法术实现。
 * castSpell 通过 getSpell(spellId) 取实现并委托 canCast/resolve。
 */
const spellRegistry = new Map<SpellID, ISpell>();

export function registerSpell(spell: ISpell): void {
  spellRegistry.set(spell.definition.spell_id, spell);
}

export function getSpell(spellId: SpellID): ISpell | undefined {
  return spellRegistry.get(spellId);
}

export function getAllSpells(): ISpell[] {
  return Array.from(spellRegistry.values());
}

// 自动注册全部法术实现
for (const spell of allSpells) {
  registerSpell(spell);
}
