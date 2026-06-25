import { describe, it, expect } from 'vitest';
import { buildInitialState } from '../src/state/state-builder';
import { assertInvariants, checkInvariants } from '../src/invariants';
import {
  PLAYER_RESOURCES,
  TOWER_COUNT,
  RAVEN_SHIELD_TOWER_COUNT,
  MOVEMENT_CARD_TOTAL,
  INITIAL_HAND_SIZE,
  WizardStateType,
  BASIC_DEFAULT_SPELL_IDS,
} from '@wt/shared';
import { basicConfig, customConfig } from './fixtures';
import { wizardsOfPlayer } from '../src/state/selectors';

describe('Phase 0 — initGame 骨架 (TC-INIT-001~006, 009)', () => {
  it.each([
    [2, 5, 6],
    [3, 4, 5],
    [4, 4, 5],
    [5, 3, 4],
    [6, 3, 4],
  ])(
    'TC-INIT-00x: %i 人局 资源数量正确 (巫师 %i / 药水 %i)',
    (playerCount, wizards, potions) => {
      const { state } = buildInitialState(basicConfig(playerCount));
      expect(Object.keys(state.players)).toHaveLength(playerCount);
      for (const p of Object.values(state.players)) {
        expect(p.wizardIds).toHaveLength(wizards);
        expect(p.potionIds).toHaveLength(potions);
        expect(p.hand).toHaveLength(INITIAL_HAND_SIZE);
        // 所有药水初始 EMPTY
        for (const pid of p.potionIds) {
          expect(state.potions[pid]!.state).toBe('EMPTY');
        }
      }
      const expected = PLAYER_RESOURCES[playerCount]!;
      expect(expected.wizardsPerPlayer).toBe(wizards);
      expect(expected.potionsPerPlayer).toBe(potions);
    },
  );

  it('TC-INIT-006: BASIC 模式默认法术池为 2 张', () => {
    const { state } = buildInitialState(basicConfig(2));
    expect(state.availableSpells).toEqual([...BASIC_DEFAULT_SPELL_IDS]);
    expect(state.availableSpells).toHaveLength(2);
  });

  it('TC-INIT-007: CUSTOM 模式固定法术池', () => {
    const { state } = buildInitialState(
      customConfig(3, ['MOVE_WIZARD_1', 'MOVE_TOWER_2', 'DRAW_CARD']),
    );
    expect(state.availableSpells).toEqual(['MOVE_WIZARD_1', 'MOVE_TOWER_2', 'DRAW_CARD']);
  });

  it('TC-INIT-008: CUSTOM 模式随机法术池 (不重复, 来自合法池)', () => {
    const { state } = buildInitialState(
      customConfig(4, [], { spellSelectionMode: 'RANDOM', spellCount: 4 }),
    );
    expect(state.availableSpells).toHaveLength(4);
    expect(new Set(state.availableSpells).size).toBe(4);
  });

  it('TC-INIT-009: 开局巫师按 setupCapacity (火苗数) 摆放到塔顶', () => {
    const { state } = buildInitialState(basicConfig(2));
    // 2 人局每人 5 巫师 = 10 巫师，全部应在塔顶（ON_TOWER_TOP）
    const allWizards = Object.values(state.wizards);
    expect(allWizards.length).toBe(10);
    for (const w of allWizards) {
      expect(w.state.mode).toBe(WizardStateType.ON_TOWER_TOP);
    }
    // 9 座塔已放置
    const towerIdsOnBoard = state.board.spaces.flatMap((s) => s.towerStack);
    expect(towerIdsOnBoard).toHaveLength(TOWER_COUNT);
    // 5 座带纹章
    const shieldTowers = towerIdsOnBoard.filter((id) => state.towers[id]!.hasRavenShield);
    expect(shieldTowers).toHaveLength(RAVEN_SHIELD_TOWER_COUNT);
    // 第一座塔（space 1）带纹章
    const firstTowerId = state.board.spaces[1]!.towerStack[0]!;
    expect(state.towers[firstTowerId]!.hasRavenShield).toBe(true);

    // 各塔位上的初始巫师数不超过其 setupCapacity
    for (const sp of state.board.spaces) {
      if (sp.towerStack.length === 0) continue;
      const topId = sp.towerStack[sp.towerStack.length - 1]!;
      const onTop = Object.values(state.wizards).filter(
        (w) =>
          w.state.mode === WizardStateType.ON_TOWER_TOP &&
          w.state.spaceIndex === sp.index &&
          w.state.topTowerId === topId,
      );
      expect(onTop.length).toBeLessThanOrEqual(sp.setupCapacity);
    }

    // 玩家轮流摆放：统计每位玩家在塔顶的巫师数 == 5
    for (const p of Object.values(state.players)) {
      expect(wizardsOfPlayer(state, p.id).length).toBe(5);
    }
  });

  it('牌堆总数 = 90，且发牌后 drawPile + discardPile + 所有手牌 = 90', () => {
    const { state } = buildInitialState(basicConfig(4));
    const handTotal = Object.values(state.players).reduce((acc, p) => acc + p.hand.length, 0);
    expect(state.drawPile.length + state.discardPile.length + handTotal).toBe(MOVEMENT_CARD_TOTAL);
  });

  it('初始不变量检查通过', () => {
    const { state } = buildInitialState(basicConfig(4));
    const v = checkInvariants(state);
    expect(v).toEqual([]);
    expect(() => assertInvariants(state)).not.toThrow();
  });

  it('回放可复现：相同 seed 两次 init 状态一致', () => {
    const a = buildInitialState(basicConfig(4, 123)).state;
    const b = buildInitialState(basicConfig(4, 123)).state;
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  });

  it('currentPlayer = 座位 0 玩家，turnPhase = ACTION_1，roundNumber = 1', () => {
    const { state } = buildInitialState(basicConfig(3));
    expect(state.currentPlayerId).toBe('P1');
    expect(state.turnPhase).toBe('ACTION_1');
    expect(state.roundNumber).toBe(1);
    expect(state.stateVersion).toBe(1);
  });
});
