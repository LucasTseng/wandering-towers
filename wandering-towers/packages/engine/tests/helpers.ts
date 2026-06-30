import type { GameState, GameConfig, GameEvent, PlayerID, WizardID, TowerID, SpaceIndex, WizardState } from '@wt/shared';
import { WizardStateType, PotionState } from '@wt/shared';
import { buildInitialState } from '../src/state/state-builder';
import { applyEvent } from '../src/state/apply-event';
import { basicConfig } from './fixtures';

/**
 * 测试辅助：构造一个干净的对局，并提供操作巫师/塔/药水的快捷方法，
 * 用于把 TC-* 用例的前置状态搭出来。
 */

export function newGame(playerCount = 2, seed = 7): { state: GameState; config: GameConfig } {
  const config = basicConfig(playerCount, seed);
  const { state } = buildInitialState(config);
  return { state, config };
}

/**
 * 构造一个「会立即把事件应用到 state」的 emit 函数。
 *
 * 规则函数是事件溯源的：只 emit 事件、不改 state（V3 §21）。
 * 测试若要断言 state，必须让 emit 同步应用事件。本 helper 返回的 emit
 * 既记录事件历史、又通过 applyEvent 应用到 state。
 */
export function mkApplyEmit(state: GameState): {
  events: GameEvent[];
  emit: (type: GameEvent['type'], payload: unknown) => GameEvent;
} {
  const events: GameEvent[] = [];
  let seq = 0;
  const emit = (type: GameEvent['type'], payload: unknown): GameEvent => {
    seq += 1;
    const evt: GameEvent = {
      eventId: `EVT_T${seq}`,
      sequence: seq,
      type,
      payload,
    };
    events.push(evt);
    applyEvent(state, evt);
    return evt;
  };
  return { events, emit };
}


/** 把巫师强制放到指定地面位置（ON_GROUND） */
export function placeWizardOnGround(state: GameState, wizardId: WizardID, spaceIndex: SpaceIndex): void {
  const w = state.wizards[wizardId];
  if (!w) throw new Error(`no wizard ${wizardId}`);
  // 清旧位置
  clearWizardLocation(state, wizardId);
  w.state = { mode: WizardStateType.ON_GROUND, spaceIndex };
  state.board.spaces[spaceIndex]!.groundVisibleWizards.push(wizardId);
}

/** 把巫师强制放到指定塔顶 */
export function placeWizardOnTower(
  state: GameState,
  wizardId: WizardID,
  spaceIndex: SpaceIndex,
  towerId: TowerID,
): void {
  const w = state.wizards[wizardId];
  if (!w) throw new Error(`no wizard ${wizardId}`);
  clearWizardLocation(state, wizardId);
  w.state = { mode: WizardStateType.ON_TOWER_TOP, spaceIndex, topTowerId: towerId };
}

/** 把巫师封印进指定塔 */
export function imprisonWizard(
  state: GameState,
  wizardId: WizardID,
  spaceIndex: SpaceIndex,
  towerId: TowerID,
  sealedAs: 'COVERED_TOWER' | 'GROUND' = 'COVERED_TOWER',
): void {
  const w = state.wizards[wizardId];
  if (!w) throw new Error(`no wizard ${wizardId}`);
  clearWizardLocation(state, wizardId);
  w.state = { mode: WizardStateType.IMPRISONED, spaceIndex, insideTowerId: towerId, sealedAs };
  const tower = state.towers[towerId]!;
  if (!tower.imprisonedWizards.includes(wizardId)) {
    tower.imprisonedWizards.push(wizardId);
  }
}

/**
 * 清空某空间的塔堆与地面巫师。
 * 为维护塔唯一性不变量，该空间原有的塔会被整体搬迁到一个「暂存空间」
 * （10~15 之间的空位），找不到则叠到 space 10。
 */
export function clearSpace(state: GameState, spaceIndex: SpaceIndex): void {
  const sp = state.board.spaces[spaceIndex]!;
  const towers = sp.towerStack;
  sp.towerStack = [];
  sp.groundVisibleWizards = [];
  if (towers.length > 0) {
    // 搬到第一个非目标、无塔的空间
    let target: number | null = null;
    for (let i = 10; i < state.board.spaces.length; i++) {
      if (i !== spaceIndex && state.board.spaces[i]!.towerStack.length === 0) {
        target = i;
        break;
      }
    }
    if (target === null) {
      // 退而叠到 space 10
      target = 10;
    }
    const dest = state.board.spaces[target]!;
    dest.towerStack.push(...towers);
    // 同步封印巫师 spaceIndex
    for (const tid of towers) {
      for (const wid of state.towers[tid]!.imprisonedWizards) {
        const w = state.wizards[wid];
        if (w && w.state.mode === 'IMPRISONED') {
          w.state = { mode: 'IMPRISONED', spaceIndex: target, insideTowerId: tid, sealedAs: w.state.sealedAs };
        }
      }
    }
  }
}

/**
 * 把一座塔整体搬迁到目标空间（清空目标空间后单放）。
 * 维护塔唯一性：从原空间移除，放到目标空间。
 */
export function relocateTower(state: GameState, towerId: TowerID, toSpaceIndex: SpaceIndex): void {
  // 先清空目标空间
  clearSpace(state, toSpaceIndex);
  // 从原空间移除该塔（连同其上方切片一并搬走）
  let moved: TowerID[] = [];
  for (const sp of state.board.spaces) {
    const idx = sp.towerStack.indexOf(towerId);
    if (idx >= 0) {
      moved = sp.towerStack.slice(idx);
      sp.towerStack = sp.towerStack.slice(0, idx);
      break;
    }
  }
  if (moved.length === 0) moved = [towerId]; // 该塔不在棋盘上
  const dest = state.board.spaces[toSpaceIndex]!;
  dest.towerStack = moved;
  dest.groundVisibleWizards = [];
  for (const tid of moved) {
    for (const wid of state.towers[tid]!.imprisonedWizards) {
      const w = state.wizards[wid];
      if (w && w.state.mode === 'IMPRISONED') {
        w.state = { mode: 'IMPRISONED', spaceIndex: toSpaceIndex, insideTowerId: tid, sealedAs: w.state.sealedAs };
      }
    }
  }
}

/** 在某空间放置一座指定塔（自动清空目标 + 从原位置移除，维护唯一性） */
export function setSingleTower(state: GameState, spaceIndex: SpaceIndex, towerId: TowerID): void {
  relocateTower(state, towerId, spaceIndex);
}

/**
 * 在指定空间构造一个自下而上的塔堆（如 [T01,T02,T03]）。
 * 维护唯一性：把这些塔从各自原位置整体搬到目标空间并按顺序叠放。
 */
export function stackTowers(state: GameState, spaceIndex: SpaceIndex, towerIds: TowerID[]): void {
  clearSpace(state, spaceIndex);
  const dest = state.board.spaces[spaceIndex]!;
  for (const tid of towerIds) {
    // 从原位置移除该塔（连同其上方切片）
    for (const sp of state.board.spaces) {
      const idx = sp.towerStack.indexOf(tid);
      if (idx >= 0) {
        sp.towerStack.splice(idx, 1);
        break;
      }
    }
    dest.towerStack.push(tid);
  }
  dest.groundVisibleWizards = [];
}

/** 把乌鸦城堡强制放到某地面空间 */
export function placeCastleOnSpace(state: GameState, spaceIndex: SpaceIndex): void {
  state.ravenCastle.position = { mode: 'ON_SPACE', spaceIndex };
}

/** 清除某空间塔顶上的所有可见巫师（移到城堡内，便于测试构造空塔顶） */
export function clearTowerTopWizards(state: GameState, spaceIndex: SpaceIndex): void {
  for (const w of Object.values(state.wizards)) {
    if (w.state.mode === 'ON_TOWER_TOP' && w.state.spaceIndex === spaceIndex) {
      w.state = { mode: 'IN_CASTLE' };
      if (!state.ravenCastle.wizardIdsInside.includes(w.id)) {
        state.ravenCastle.wizardIdsInside.push(w.id);
      }
    }
  }
}

/** 把乌鸦城堡强制放到某塔顶 */
export function placeCastleOnTower(state: GameState, spaceIndex: SpaceIndex, towerId: TowerID): void {
  state.ravenCastle.position = { mode: 'ON_TOWER', spaceIndex, topTowerId: towerId };
}

/** 给玩家设置药水状态（按顺序填） */
export function setPotions(state: GameState, playerId: PlayerID, states: PotionState[]): void {
  const player = state.players[playerId]!;
  for (let i = 0; i < player.potionIds.length && i < states.length; i++) {
    state.potions[player.potionIds[i]!]!.state = states[i]!;
  }
}

/** 取某玩家第一张手牌的 cardId（用于出牌测试） */
export function firstHandCard(state: GameState, playerId: PlayerID): string {
  return state.players[playerId]!.hand[0]!;
}

function clearWizardLocation(state: GameState, wizardId: WizardID): void {
  const w = state.wizards[wizardId]!;
  if (w.state.mode === WizardStateType.ON_GROUND) {
    const arr = state.board.spaces[w.state.spaceIndex]!.groundVisibleWizards;
    const i = arr.indexOf(wizardId);
    if (i >= 0) arr.splice(i, 1);
  }
  if (w.state.mode === WizardStateType.IMPRISONED) {
    const tower = state.towers[w.state.insideTowerId];
    if (tower) tower.imprisonedWizards = tower.imprisonedWizards.filter((id) => id !== wizardId);
  }
}

export type { WizardState };
