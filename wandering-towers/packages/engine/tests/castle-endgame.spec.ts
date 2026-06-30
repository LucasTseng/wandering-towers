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
    w.state = { mode: 'IMPRISONED', spaceIndex: 1, insideTowerId: t01, sealedAs: 'COVERED_TOWER' };
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

  it('TC-CASTLE-006: 地面有纹章但顶塔无纹章 -> 不可落到该顶塔（顺时针跳过）', () => {
    // space 0 地面有纹章，但放上无纹章塔 T06；城堡在 space 15，顺时针首候选即 space 0。
    // 修复后：space 0 因顶塔无纹章不合法 -> 跳过，落到下一个合法位 space 1（T01 有纹章、塔顶无人）。
    // 修复前：space 0 因地面纹章被误判合法 -> 城堡错落到无纹章顶塔 T06 上。
    const { state } = newGame(2);
    // 清场：所有巫师移入城堡
    for (const w of Object.values(state.wizards)) {
      if (w.state.mode === WizardStateType.ON_GROUND) {
        const sp = state.board.spaces[w.state.spaceIndex]!;
        sp.groundVisibleWizards = sp.groundVisibleWizards.filter((id) => id !== w.id);
      }
      w.state = { mode: WizardStateType.IN_CASTLE };
    }
    state.ravenCastle.wizardIdsInside = Object.keys(state.wizards);
    // 城堡到 space 15（无塔空位）；space 0 放无纹章塔 T06；space 1 T01 塔顶无人
    placeCastleOnSpace(state, 15);
    clearSpace(state, 0);
    setSingleTower(state, 0, 'T06'); // T06 无纹章
    clearTowerTopWizards(state, 1); // T01（有纹章）塔顶清空，作为合法 fallback
    const { emit } = mkApplyEmit(state);
    const r = advanceRavenCastleAfterWizardEntered(state, emit);
    expect(r.moved).toBe(true);
    // 跳过 space 0（顶塔 T06 无纹章），落到 space 1 的 T01 顶
    expect(state.ravenCastle.position).toMatchObject({
      mode: 'ON_TOWER',
      spaceIndex: 1,
      topTowerId: 'T01',
    });
    assertInvariants(state);
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
