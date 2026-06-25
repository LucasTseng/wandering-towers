import type {
  BoardState,
  GameConfig,
  GameState,
  PlayerID,
  PlayerState,
  Potion,
  PotionID,
  RavenCastleState,
  SpaceState,
  TowerID,
  TowerRuntimeState,
  WizardID,
  WizardRuntime,
  WizardState,
  CardID,
  SpellID,
  MovementCardInstance,
} from '@wt/shared';
import {
  BASIC_DEFAULT_SPELL_IDS,
  PLAYER_COLORS,
  PLAYER_RESOURCES,
  MIN_PLAYERS,
  MAX_PLAYERS,
  TOWER_COUNT,
  INITIAL_HAND_SIZE,
  PotionState,
  SpellSelectionMode,
  TurnPhase,
  WizardStateType,
  STANDARD_MAP,
  MOVEMENT_CARD_TEMPLATES,
  TEMPLATE_QUANTITIES,
  assertDeckTotal,
  STANDARD_SPELL_IDS,
  SPELL_BY_ID,
  SpellUsageScope,
  GameMode,
} from '@wt/shared';
import type { Rng } from './rng';
import { createRng } from './rng';

/**
 * GameState 构造器（V4 §14.2 initGame 的状态构建部分）
 *
 * 这里只负责「构造一个合法的初始 GameState 骨架并完成开局摆放」，
 * 命令结算逻辑由 RuleEngine（T0.5）与 rules/*（Phase 1）实现。
 *
 * 开局摆放口径（V4 §11.1 / V2 规则 §5）：
 *  - 玩家按座位顺位轮流，每次放 1 名巫师到塔顶
 *  - 从乌鸦城堡右侧第一座塔（space 1）起，按 setupCapacity 放满再进下一座
 *  - 容量来自 MapDefinition.setupCapacity（火苗数），不写死 3/2/1
 */

export interface InitResult {
  state: GameState;
  events: import('@wt/shared').GameEvent[];
  rng: Rng;
}

export function buildInitialState(config: GameConfig, rngSeed?: number): InitResult {
  validateConfig(config);

  const rng = createRng(rngSeed ?? defaultSeed(config));
  const events: import('@wt/shared').GameEvent[] = [];

  // 1. build board from map definition
  const board = buildBoard();

  // 2. create players, wizards, potions
  const { players, wizards, potions } = createPlayersAndPieces(config);

  // 3. create towers
  const towers = createTowers();

  // 4. create movement deck and shuffle
  const { drawPile, discardPile, cardTemplateMap } = buildAndShuffleDeck(rng);

  // 5. determine spell pool according to spellSetup
  const availableSpells = resolveAvailableSpells(config, rng);

  // 6. place raven castle at initial position
  const ravenCastle: RavenCastleState = {
    position: { mode: 'ON_SPACE', spaceIndex: STANDARD_MAP.ravenCastleInitial.spaceIndex },
    wizardIdsInside: [],
  };

  // 7. place towers at initial board positions
  placeTowersOnBoard(board, towers);

  // 8. draw INITIAL_HAND_SIZE cards for each player
  for (const player of Object.values(players)) {
    for (let i = 0; i < INITIAL_HAND_SIZE; i++) {
      const card = drawPile.pop();
      if (card) player.hand.push(card);
    }
  }

  // 9. place wizards by player order, according to each setup area's flame capacity
  placeWizardsInitial(board, wizards, players);

  // 10-14. set currentPlayer, turnPhase, roundNumber
  const playerOrder = Object.values(players)
    .sort((a, b) => a.seatIndex - b.seatIndex)
    .map((p) => p.id);

  const state: GameState = {
    config: { ...config, seed: rng.seed },
    currentPlayerId: playerOrder[0]!,
    turnPhase: TurnPhase.ACTION_1,
    roundNumber: 1,
    board,
    towers,
    wizards,
    potions,
    players,
    ravenCastle,
    drawPile,
    discardPile,
    availableSpells,
    endgameTriggered: false,
    endgameTriggerPlayerId: null,
    endgameTriggerRound: null,
    winners: [],
    scores: {},
    sharedVictory: false,
    stateVersion: 1,
    playerOrder,
  } as GameState;

  // 挂载 cardId -> templateId 映射（供 play-card 反查牌面，非序列化状态字段）
  (state as unknown as { _cardTemplates: Record<string, string> })._cardTemplates = cardTemplateMap;

  // 16. emit INIT_COMPLETED
  events.push({
    eventId: `EVT_0001`,
    sequence: 1,
    type: 'INIT_COMPLETED' as never,
    actorPlayerId: state.currentPlayerId,
    payload: { config: state.config, startingPlayerId: state.currentPlayerId },
  });

  return { state, events, rng };
}

/* ----------------------------- 内部构建函数 ----------------------------- */

function validateConfig(config: GameConfig): void {
  if (config.playerCount < MIN_PLAYERS || config.playerCount > MAX_PLAYERS) {
    throw new Error(`playerCount must be ${MIN_PLAYERS}~${MAX_PLAYERS}, got ${config.playerCount}`);
  }
  if (!PLAYER_RESOURCES[config.playerCount]) {
    throw new Error(`No resource config for playerCount=${config.playerCount}`);
  }
  if (config.mode !== GameMode.BASIC && config.mode !== GameMode.CUSTOM && config.mode !== GameMode.MASTER_VARIANT) {
    throw new Error(`Invalid mode: ${config.mode}`);
  }
}

function defaultSeed(config: GameConfig): number {
  // 用配置派生一个稳定种子；真正对局可外部传入更随机种子。
  let h = 2166136261 ^ config.playerCount;
  for (const c of config.mode) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  return h >>> 0;
}

function buildBoard(): BoardState {
  const spaces: SpaceState[] = STANDARD_MAP.spaces.map((s) => ({
    index: s.index,
    groundHasRavenShield: s.groundHasRavenShield,
    setupCapacity: s.setupCapacity,
    groundVisibleWizards: [],
    towerStack: [],
  }));
  return { spaces };
}

function createPlayersAndPieces(config: GameConfig): {
  players: Record<PlayerID, PlayerState>;
  wizards: Record<WizardID, WizardRuntime>;
  potions: Record<PotionID, Potion>;
} {
  const res = PLAYER_RESOURCES[config.playerCount]!;
  const players: Record<PlayerID, PlayerState> = {};
  const wizards: Record<WizardID, WizardRuntime> = {};
  const potions: Record<PotionID, Potion> = {};

  for (let seat = 0; seat < config.playerCount; seat++) {
    const playerId: PlayerID = `P${seat + 1}`;
    const color = PLAYER_COLORS[seat] ?? 'gray';
    const wizardIds: WizardID[] = [];
    const potionIds: PotionID[] = [];

    for (let w = 0; w < res.wizardsPerPlayer; w++) {
      const wid: WizardID = `W_${playerId}_${String(w + 1).padStart(2, '0')}`;
      wizardIds.push(wid);
      // 初始巫师状态稍后在 placeWizardsInitial 中设置；这里先置 ON_GROUND(space 0) 占位。
      const initial: WizardState = { mode: WizardStateType.ON_GROUND, spaceIndex: 0 };
      wizards[wid] = { id: wid, ownerPlayerId: playerId, state: initial };
    }

    for (let p = 0; p < res.potionsPerPlayer; p++) {
      const pid: PotionID = `PT_${playerId}_${String(p + 1).padStart(2, '0')}`;
      potionIds.push(pid);
      potions[pid] = { id: pid, ownerPlayerId: playerId, state: PotionState.EMPTY };
    }

    players[playerId] = {
      id: playerId,
      seatIndex: seat,
      color,
      wizardIds,
      potionIds,
      hand: [],
      spellsCastThisTurn: 0,
    };
  }

  return { players, wizards, potions };
}

function createTowers(): Record<TowerID, TowerRuntimeState> {
  const towers: Record<TowerID, TowerRuntimeState> = {};
  for (const def of STANDARD_MAP.towers) {
    towers[def.id] = { id: def.id, hasRavenShield: def.hasRavenShield, imprisonedWizards: [], sealed: false };
  }
  if (Object.keys(towers).length !== TOWER_COUNT) {
    throw new Error(`Tower count mismatch: expected ${TOWER_COUNT}`);
  }
  return towers;
}

function placeTowersOnBoard(board: BoardState, _towers: Record<TowerID, TowerRuntimeState>): void {
  for (const def of STANDARD_MAP.towers) {
    const sp = board.spaces[def.initialSpaceIndex];
    if (!sp) {
      throw new Error(`Tower initial space out of range: ${def.initialSpaceIndex}`);
    }
    sp.towerStack.push(def.id);
  }
}

function buildAndShuffleDeck(rng: Rng): {
  drawPile: CardID[];
  discardPile: CardID[];
  cardTemplateMap: Record<string, string>;
} {
  assertDeckTotal();
  const instances: MovementCardInstance[] = [];
  const cardTemplateMap: Record<string, string> = {};
  let counter = 0;
  for (const tmpl of MOVEMENT_CARD_TEMPLATES) {
    const qty = TEMPLATE_QUANTITIES[tmpl.templateId] ?? 0;
    for (let i = 0; i < qty; i++) {
      counter++;
      const id: CardID = `C_${String(counter).padStart(5, '0')}`;
      instances.push({ id, templateId: tmpl.templateId });
      cardTemplateMap[id] = tmpl.templateId;
    }
  }
  // 洗牌（Fisher–Yates）
  const shuffled = rng.shuffle(instances.map((c) => c.id));
  return { drawPile: shuffled, discardPile: [], cardTemplateMap };
}

function resolveAvailableSpells(config: GameConfig, rng: Rng): SpellID[] {
  const setup = config.spellSetup;

  if (config.mode === GameMode.BASIC) {
    // BASIC 默认 2 张（V4 §13.8 模式 A）
    return [...BASIC_DEFAULT_SPELL_IDS];
  }

  // CUSTOM / MASTER
  const mode = setup.spellSelectionMode ?? SpellSelectionMode.FIXED;
  if (mode === SpellSelectionMode.FIXED) {
    const ids = setup.selectedSpellIds ?? [];
    validateSpellIds(ids, config.mode);
    return [...ids];
  }
  // RANDOM
  const n = setup.spellCount ?? BASIC_DEFAULT_SPELL_IDS.length;
  const pool = STANDARD_SPELL_IDS.filter((id) => spellAllowedForMode(id, config.mode));
  const picked = rng.shuffle([...pool]).slice(0, n);
  return picked;
}

function spellAllowedForMode(spellId: SpellID, mode: GameMode): boolean {
  const def = SPELL_BY_ID[spellId];
  if (!def) return false;
  if (mode === GameMode.BASIC) return def.usage_scope.includes(SpellUsageScope.BASIC);
  if (mode === GameMode.CUSTOM) return def.usage_scope.includes(SpellUsageScope.CUSTOM);
  return def.usage_scope.includes(SpellUsageScope.MASTER);
}

function validateSpellIds(ids: SpellID[], mode: GameMode): void {
  for (const id of ids) {
    if (!SPELL_BY_ID[id]) {
      throw new Error(`Unknown spell in selectedSpellIds: ${id}`);
    }
    if (!spellAllowedForMode(id, mode)) {
      throw new Error(`Spell ${id} not allowed in mode ${mode}`);
    }
  }
}

/**
 * 开局摆放巫师（V4 §11.1 / V2 规则 §5）
 *
 * 玩家按座位顺序轮流，每次放 1 名巫师到塔顶。
 * 从乌鸦城堡右侧第一座塔（space 1）起，按 setupCapacity 放满当前塔位再进下一座。
 * 巫师放到塔顶 -> ON_TOWER_TOP(topTowerId)。
 *
 * 实现要点：按 setupCapacity 顺序消费「塔位容量槽」，
 * 玩家轮流填入，直到所有玩家巫师放完。
 */
function placeWizardsInitial(
  board: BoardState,
  wizards: Record<WizardID, WizardRuntime>,
  players: Record<PlayerID, PlayerState>,
): void {
  // 按座位顺序的玩家队列
  const orderedPlayers = Object.values(players).sort((a, b) => a.seatIndex - b.seatIndex);
  // 每位玩家待放置的巫师队列
  const pending: { playerId: PlayerID; wizardIds: WizardID[] }[] = orderedPlayers.map((p) => ({
    playerId: p.id,
    wizardIds: [...p.wizardIds],
  }));

  // 塔位容量槽：按 space 1..9 顺序，每个塔位 setupCapacity 个槽位
  const towerSlots: { spaceIndex: number; topTowerId: TowerID }[] = [];
  for (const def of STANDARD_MAP.towers) {
    const sp = board.spaces[def.initialSpaceIndex]!;
    const top = sp.towerStack[sp.towerStack.length - 1];
    if (!top) continue; // 该塔位无塔则跳过（标准版塔位均有塔）
    const cap = sp.setupCapacity;
    for (let c = 0; c < cap; c++) {
      towerSlots.push({ spaceIndex: sp.index, topTowerId: top });
    }
  }

  // 校验：容量槽总数应 >= 所有玩家巫师总数
  const totalWizards = pending.reduce((acc, p) => acc + p.wizardIds.length, 0);
  if (towerSlots.length < totalWizards) {
    throw new Error(
      `Setup capacity ${towerSlots.length} < total wizards ${totalWizards}; map config invalid`,
    );
  }

  let slotIdx = 0;
  let remaining = totalWizards;
  while (remaining > 0) {
    for (const p of pending) {
      if (p.wizardIds.length === 0) continue;
      const wid = p.wizardIds.shift()!;
      const slot = towerSlots[slotIdx]!;
      slotIdx++;
      const w = wizards[wid]!;
      w.state = { mode: WizardStateType.ON_TOWER_TOP, spaceIndex: slot.spaceIndex, topTowerId: slot.topTowerId };
      // 地面可见巫师数组保持空（巫师在塔顶）。塔顶可见性由 selectors 派生。
      remaining--;
      if (remaining === 0) break;
    }
  }
}
