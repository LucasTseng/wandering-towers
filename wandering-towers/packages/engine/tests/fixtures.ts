import type { GameConfig, GameMode } from '@wt/shared';
import { GameMode as GM } from '@wt/shared';

/** 构造 BASIC 模式配置 */
export function basicConfig(playerCount: number, seed = 42): GameConfig {
  return {
    playerCount,
    mode: GM.BASIC,
    spellSetup: {
      mode: GM.BASIC,
      selectedSpellIds: ['MOVE_WIZARD_1', 'MOVE_TOWER_2'],
      spellPoolSource: 'ALL',
      spellSelectionMode: 'FIXED',
      spellCount: 2,
      maxSpellsPerTurn: 1,
      nonActivePlayersCanCast: false,
      castTimingMode: 'ACTIVE_ONLY',
    },
    seed,
  };
}

/** 构造 CUSTOM 模式配置 */
export function customConfig(
  playerCount: number,
  selectedSpellIds: string[],
  opts: Partial<{ seed: number; spellSelectionMode: 'FIXED' | 'RANDOM'; spellCount: number; maxSpellsPerTurn: number }> = {},
): GameConfig {
  const mode: GameMode = GM.CUSTOM;
  return {
    playerCount,
    mode,
    spellSetup: {
      mode,
      selectedSpellIds,
      spellPoolSource: 'ALL',
      spellSelectionMode: opts.spellSelectionMode ?? 'FIXED',
      spellCount: opts.spellCount ?? selectedSpellIds.length,
      maxSpellsPerTurn: opts.maxSpellsPerTurn ?? 1,
      nonActivePlayersCanCast: false,
      castTimingMode: 'ACTIVE_ONLY',
    },
    seed: opts.seed ?? 42,
  };
}
