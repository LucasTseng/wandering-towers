import type { GameMode } from '../enums/game-mode';
import type { SpellSelectionMode, CastTimingMode } from '../enums/spell-selection-mode';
import type { SpellID } from './ids';

/**
 * 法术配置（V2 开发需求 §13 / V3 数据字典 §5）
 *
 * - BASIC 模式下 selectedSpellIds 可由初始化逻辑自动生成为 2 张默认法术
 * - spellSelectionMode: FIXED 指定 / RANDOM 随机抽取 N 张
 * - maxSpellsPerTurn: BASIC/CUSTOM 通常为 1，MASTER 可扩展
 * - nonActivePlayersCanCast: 基础模式为 false
 * - castTimingMode: ACTIVE_ONLY 当前玩家施法 / REACTION_WINDOW 预留
 */
export interface SpellSetupConfig {
  mode: GameMode;
  /** 本局实际启用的法术 ID 列表（BASIC 可由 init 自动生成） */
  selectedSpellIds?: SpellID[];
  /** 当前固定为 'ALL'，预留基础池/扩展池区分 */
  spellPoolSource?: 'ALL';
  spellSelectionMode?: SpellSelectionMode;
  /** 随机抽取时使用 */
  spellCount?: number;
  maxSpellsPerTurn: number;
  nonActivePlayersCanCast: boolean;
  castTimingMode: CastTimingMode;
}

/**
 * 游戏配置（V2 开发需求 §13 / V3 数据字典 §4）
 */
export interface GameConfig {
  playerCount: number; // 2~6
  mode: GameMode;
  spellSetup: SpellSetupConfig;
  /** 随机种子（用于回放可复现；不传则由引擎生成并写回） */
  seed?: number;
}
