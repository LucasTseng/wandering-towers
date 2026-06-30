import type { GameConfig, SpellID } from '@wt/shared';
import { GameMode, SpellSelectionMode, CastTimingMode } from '@wt/shared';

/** 全部 7 法术（CUSTOM 模式启用） */
export const ALL_SPELLS: SpellID[] = [
  'MOVE_WIZARD_1',
  'MOVE_TOWER_2',
  'FREE_A_WIZARD',
  'MOVE_RAVEN_CASTLE',
  'SWAP_TWO_TOWERS',
  'DRAW_CARD',
  'REUSE_LAST_CARD',
];

/**
 * 默认对局配置：2 人 CUSTOM 模式，启用全部法术，每回合最多施法 1 次。
 */
export function defaultConfig(playerCount = 2): GameConfig {
  return {
    playerCount,
    mode: GameMode.CUSTOM,
    spellSetup: {
      mode: GameMode.CUSTOM,
      selectedSpellIds: ALL_SPELLS,
      spellPoolSource: 'ALL',
      spellSelectionMode: SpellSelectionMode.FIXED,
      spellCount: ALL_SPELLS.length,
      maxSpellsPerTurn: 1,
      nonActivePlayersCanCast: false,
      castTimingMode: CastTimingMode.ACTIVE_ONLY,
    },
    seed: 42,
  };
}

/** 法术中文名映射（UI 展示） */
export const SPELL_ZH_NAME: Record<string, string> = {
  MOVE_WIZARD_1: '移动巫师',
  MOVE_TOWER_2: '移动塔',
  FREE_A_WIZARD: '解封巫师',
  MOVE_RAVEN_CASTLE: '移动城堡',
  SWAP_TWO_TOWERS: '交换双塔',
  DRAW_CARD: '抽牌',
  REUSE_LAST_CARD: '复用上一张',
};

/** 法术用途说明（§10.3 第 4 区） */
export const SPELL_ZH_DESC: Record<string, string> = {
  MOVE_WIZARD_1: '将一名巫师移动 1 格',
  MOVE_TOWER_2: '将一座塔（含其上整段）移动 2 格',
  FREE_A_WIZARD: '解救一名被封印的巫师',
  MOVE_RAVEN_CASTLE: '移动乌鸦城堡到相邻空间',
  SWAP_TWO_TOWERS: '交换两座塔堆的位置',
  DRAW_CARD: '立即抽取 1 张牌',
  REUSE_LAST_CARD: '复用上一张打出的牌',
};

/** 标准版法术消耗药水数（§10.3 第 4 区，当前均为 1） */
export const SPELL_POTION_COST: Record<string, number> = {
  MOVE_WIZARD_1: 1,
  MOVE_TOWER_2: 1,
  FREE_A_WIZARD: 1,
  MOVE_RAVEN_CASTLE: 1,
  SWAP_TWO_TOWERS: 1,
  DRAW_CARD: 1,
  REUSE_LAST_CARD: 1,
};

/** 玩家颜色（与 PLAYER_COLORS 对齐） */
export const PLAYER_COLORS: Record<string, string> = {
  P1: '#e74c3c',
  P2: '#3498db',
  P3: '#27ae60',
  P4: '#f1c40f',
  P5: '#9b59b6',
  P6: '#e67e22',
};
