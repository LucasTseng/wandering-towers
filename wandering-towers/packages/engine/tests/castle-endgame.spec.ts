import { describe, it, expect } from 'vitest';
import { advanceRavenCastleAfterWizardEntered } from '../src/rules/raven-castle';
import { checkEndgameTrigger, resolveFinalWinners, satisfiesEndgame } from '../src/rules/endgame';
import { assertInvariants } from '../src/invariants';
import {
  newGame,
  clearSpace,
  setSingleTower,
  placeWizardOnGround,
  placeCastleOnSpace,
  setPotions,
  clearTowerTopWizards,
  mkApplyEmit,
} from './helpers';
import { WizardStateType } from '@wt/shared';

describe('TC-CASTLE 乌鸦城堡移动', () => {
  it('TC-CASTLE-001: 巫师进堡后城堡移动到下一个合法乌鸦位', () => {
    const { state } = newGame(2);
    placeCastleOnSpace(state, 0);
    clearTowerTopWizards(state, 1); // space 1 塔顶清空
    const { emit } = mkApplyEmit(state);
    const r = advanceRavenCastleAfterWizardEntered(state, emit);
    expect(r.moved).toBe(true);
    expect(state.ravenCastle.position).toMatchObject({ mode: 'ON_TOWER', spaceIndex: 1 });
  });

  it('TC-CASTLE-002: 乌鸦位地面有可见巫师 -> 跳过', () => {
    const { state } = newGame(2);
    placeCastleOnSpace(state, 0);
    // 在 space 1 地面放一名可见巫师，但 space 1 是塔位——改在带纹章塔顶放巫师
    // space 1 塔顶放巫师使其不合法
    const t01 = state.board.spaces[1]!.towerStack[0]!;
    const w = state.wizards['W_P1_01']!;
    w.state = { mode: WizardStateType.ON_TOWER_TOP, spaceIndex: 1, topTowerId: t01 };
    const { emit } = mkApplyEmit(state);
    const r = advanceRavenCastleAfterWizardEntered(state, emit);
    expect(r.moved).toBe(true);
    // 应跳过 space 1，找下一个纹章位
    expect(state.ravenCastle.position.spaceIndex).not.toBe(1);
  });

  it('TC-CASTLE-004: 乌鸦位塔内有封印巫师但顶上没人 -> 仍可落', () => {
    const { state } = newGame(2);
    placeCastleOnSpace(state, 0);
    clearTowerTopWizards(state, 1); // 塔顶无人
    const t01 = state.board.spaces[1]!.towerStack[0]!;
    // 取一名不在城堡内的巫师封进塔（避免与 castle.inside 不一致）
    const wid = 'W_P2_03';
    const w = state.wizards[wid]!;
    // 若该巫师已被 clearTowerTopWizards 移入城堡，先移出
    if (w.state.mode === 'IN_CASTLE') {
      const i = state.ravenCastle.wizardIdsInside.indexOf(wid);
      if (i >= 0) state.ravenCastle.wizardIdsInside.splice(i, 1);
    }
    w.state = { mode: 'IMPRISONED', spaceIndex: 1, insideTowerId: t01 };
    if (!state.towers[t01]!.imprisonedWizards.includes(wid)) {
      state.towers[t01]!.imprisonedWizards.push(wid);
    }
    const { emit } = mkApplyEmit(state);
    const r = advanceRavenCastleAfterWizardEntered(state, emit);
    expect(r.moved).toBe(true);
    expect(state.ravenCastle.position.spaceIndex).toBe(1);
    assertInvariants(state);
  });

  it('TC-CASTLE-005: 没有合法乌鸦位 -> 城堡不动', () => {
    const { state } = newGame(2);
    placeCastleOnSpace(state, 0);
    // 让所有带纹章塔顶都有可见巫师
    const shieldTowerSpaces = state.board.spaces.filter(
      (s) => s.towerStack.length > 0 && state.towers[s.towerStack[s.towerStack.length - 1]!]?.hasRavenShield,
    );
    const wizards = Object.values(state.wizards);
    let wi = 0;
    for (const sp of shieldTowerSpaces) {
      const top = sp.towerStack[sp.towerStack.length - 1]!;
      const w = wizards[wi++];
      if (w) w.state = { mode: WizardStateType.ON_TOWER_TOP, spaceIndex: sp.index, topTowerId: top };
    }
    // space 0 本身是地面纹章位，放个地面巫师使其不合法
    placeWizardOnGround(state, 'W_P1_01', 0);
    const { emit } = mkApplyEmit(state);
    const r = advanceRavenCastleAfterWizardEntered(state, emit);
    expect(r.moved).toBe(false);
    expect(state.ravenCastle.position).toMatchObject({ mode: 'ON_SPACE', spaceIndex: 0 });
  });
});

describe('TC-END 终局判定', () => {
  function putAllWizardsInCastle(state: ReturnType<typeof newGame>['state'], playerId: string): void {
    for (const wid of state.players[playerId]!.wizardIds) {
      const w = state.wizards[wid]!;
      w.state = { mode: 'IN_CASTLE' };
      if (!state.ravenCastle.wizardIdsInside.includes(wid)) state.ravenCastle.wizardIdsInside.push(wid);
    }
  }

  it('TC-END-001: 全进堡但仍有空瓶 -> 不触发', () => {
    const { state } = newGame(2);
    putAllWizardsInCastle(state, 'P1');
    // P1 仍有空瓶（初始全 EMPTY）
    const { emit } = mkApplyEmit(state);
    expect(checkEndgameTrigger(state, 'P1', emit)).toBe(false);
    expect(state.endgameTriggered).toBe(false);
  });

  it('TC-END-002: 没空瓶但仍有巫师未进堡 -> 不触发', () => {
    const { state } = newGame(2);
    setPotions(state, 'P1', ['FULL', 'FULL', 'FULL', 'FULL', 'FULL', 'FULL']);
    // 巫师未进堡
    const { emit } = mkApplyEmit(state);
    expect(checkEndgameTrigger(state, 'P1', emit)).toBe(false);
  });

  it('TC-END-003: 同时满足两条件 -> 触发', () => {
    const { state } = newGame(2);
    putAllWizardsInCastle(state, 'P1');
    setPotions(state, 'P1', ['FULL', 'FULL', 'SPENT', 'SPENT', 'SPENT', 'SPENT']); // EMPTY=0
    const { emit } = mkApplyEmit(state);
    expect(checkEndgameTrigger(state, 'P1', emit)).toBe(true);
    expect(state.endgameTriggered).toBe(true);
    expect(state.endgameTriggerPlayerId).toBe('P1');
    assertInvariants(state);
  });

  it('TC-END-005: 多人同轮达成时比较 FULL 数量', () => {
    const { state } = newGame(2);
    putAllWizardsInCastle(state, 'P1');
    putAllWizardsInCastle(state, 'P2');
    setPotions(state, 'P1', ['FULL', 'FULL', 'SPENT', 'SPENT', 'SPENT', 'SPENT']); // FULL=2
    setPotions(state, 'P2', ['FULL', 'SPENT', 'SPENT', 'SPENT', 'SPENT', 'SPENT']); // FULL=1
    expect(satisfiesEndgame(state, 'P1')).toBe(true);
    expect(satisfiesEndgame(state, 'P2')).toBe(true);
    const result = resolveFinalWinners(state);
    expect(result.winners).toEqual(['P1']);
  });

  it('TC-END-006: 多人同轮且 FULL 相同 -> 并列', () => {
    const { state } = newGame(2);
    putAllWizardsInCastle(state, 'P1');
    putAllWizardsInCastle(state, 'P2');
    setPotions(state, 'P1', ['FULL', 'FULL', 'SPENT', 'SPENT', 'SPENT', 'SPENT']);
    setPotions(state, 'P2', ['FULL', 'FULL', 'SPENT', 'SPENT', 'SPENT', 'SPENT']);
    const result = resolveFinalWinners(state);
    expect(result.shared).toBe(true);
    expect(result.winners).toHaveLength(2);
  });
});
