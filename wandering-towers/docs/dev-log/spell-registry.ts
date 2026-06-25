import type { SpellID } from '@wt/shared';
import { RuleErrorCode } from '@wt/shared';
import { RuleError } from '../../rule-error';
import type { ISpell } from './spell';

// TODO (T2.3): 在此注册所有法术实现
// import { TeleportSpell } from './teleport';

const spellRegistry = new Map<SpellID, ISpell>();

// spellRegistry.set('SP_TELEPORT', new TeleportSpell());

/**
 * 根据 SpellID 查找对应的法术实现
 */
export function findSpell(spellId: SpellID): ISpell {
  const spell = spellRegistry.get(spellId);
  if (!spell) {
    throw new RuleError(RuleErrorCode.SPELL_NOT_FOUND, `Spell with id ${spellId} is not registered.`);
  }
  return spell;
}