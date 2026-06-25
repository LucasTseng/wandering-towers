/**
 * 按人数使用的巫师与药水瓶数量（V2 规则 §2.3）
 *
 * 玩家数 | 每人巫师数 | 每人药水瓶数
 *   2    |     5      |     6
 *   3    |     4      |     5
 *   4    |     4      |     5
 *   5    |     3      |     4
 *   6    |     3      |     4
 */
export interface PlayerResourceConfig {
  wizardsPerPlayer: number;
  potionsPerPlayer: number;
}

export const PLAYER_RESOURCES: Readonly<Record<number, PlayerResourceConfig>> = {
  2: { wizardsPerPlayer: 5, potionsPerPlayer: 6 },
  3: { wizardsPerPlayer: 4, potionsPerPlayer: 5 },
  4: { wizardsPerPlayer: 4, potionsPerPlayer: 5 },
  5: { wizardsPerPlayer: 3, potionsPerPlayer: 4 },
  6: { wizardsPerPlayer: 3, potionsPerPlayer: 4 },
};

export const MIN_PLAYERS = 2;
export const MAX_PLAYERS = 6;

/** 棋盘空间总数（4 块道路板拼成环形） */
export const SPACE_COUNT = 16;

/** 塔总数 */
export const TOWER_COUNT = 9;

/** 其中带乌鸦纹章的塔数 */
export const RAVEN_SHIELD_TOWER_COUNT = 5;

/** 移动牌总数 */
export const MOVEMENT_CARD_TOTAL = 90;

/** 每位玩家初始手牌数 */
export const INITIAL_HAND_SIZE = 3;

/** 单个落点可见巫师上限（V2 规则 §10.5） */
export const VISIBLE_WIZARD_CAPACITY_PER_SPACE = 6;

/** 起始手牌/补牌目标数 */
export const TARGET_HAND_SIZE = 3;

/** 基础模式每回合施法上限 */
export const BASIC_MAX_SPELLS_PER_TURN = 1;

/** 基础模式默认法术（V4 §13.8 模式 A） */
export const BASIC_DEFAULT_SPELL_IDS = ['MOVE_WIZARD_1', 'MOVE_TOWER_2'] as const;

/** 玩家颜色（按座位顺序） */
export const PLAYER_COLORS = ['red', 'blue', 'green', 'yellow', 'purple', 'orange'] as const;
