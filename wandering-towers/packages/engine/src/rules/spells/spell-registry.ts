import type { SpellId } from '../../../../shared/src/types';
import type { ISpell } from './spell';
import { allSpells } from './implementations';

const spellRegistry = new Map<SpellId, ISpell>();

export function registerSpell(spell: ISpell): void {
  if (spellRegistry.has(spell.definition.spell_id)) {
    // In a real app, you might want to handle this more gracefully,
    // but for now, a console warning is fine during development.
    console.warn(`Spell with ID ${spell.definition.spell_id} is already registered. Overwriting.`);
  }
  spellRegistry.set(spell.definition.spell_id, spell);
}

export function getSpell(spellId: SpellId): ISpell | undefined {
  return spellRegistry.get(spellId);
}

export function getAllSpells(): ISpell[] {
  return Array.from(spellRegistry.values());
}

function registerAllSpells() {
  for (const spell of allSpells) {
    registerSpell(spell);
  }
}

// Automatically register all spells when this module is loaded.
registerAllSpells();