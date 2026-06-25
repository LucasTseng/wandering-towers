import { describe, it, expect } from 'vitest';
import { WizardStateType } from '@wt/shared';
import { moveWizardExact } from '../src/rules/move-wizard';
import { RuleError } from '../src/rule-error';
import { RuleErrorCode } from '@wt/shared';
import { assertInvariants } from '../src/invariants';
import {
  newGame,
  placeWizardOnGround,
  placeWizardOnTower,
  clearSpace,
  placeCastleOnSpace,
  imprisonWizard,
  placeWizardOnTower as onTower,
  mkApplyEmit,
} from './helpers';


describe('TC-WIZ 巫师移动', () => {
  it('TC-WIZ-001: 地面巫师移动到空地', () => {
    const { state } = newGame(2);
    clearSpace(state, 5);
    placeWizardOnGround(state, 'W_P1_01', 2);
    const { emit } = mkApplyEmit(state);
    const r = moveWizardExact(state, 'P1', 'W_P1_01', 3, 'MOVEMENT_CARD', {}, emit);
    expect(r.enteredCastle).toBe(false);
    expect(state.wizards['W_P1_01']!.state).toEqual({ mode: 'ON_GROUND', spaceIndex: 5 });
    assertInvariants(state);
  });

  it('TC-WIZ-002: 地面巫师移动到有塔位置 -> 落塔顶', () => {
    const { state } = newGame(2);
    // space 5 放一座塔 T03（保留其原位，或借用现有塔）
    const { events, emit } = mkApplyEmit(state);
    placeWizardOnGround(state, 'W_P1_01', 2);
    // 找一座已在 board 上的塔搬到 space 5
    const towerId = state.board.spaces[1]!.towerStack[0]!;
    state.board.spaces[1]!.towerStack = [];
    state.board.spaces[5]!.towerStack = [towerId];
    state.board.spaces[5]!.groundVisibleWizards = [];
    moveWizardExact(state, 'P1', 'W_P1_01', 3, 'MOVEMENT_CARD', {}, emit);
    expect(state.wizards['W_P1_01']!.state).toEqual({
      mode: 'ON_TOWER_TOP',
      spaceIndex: 5,
      topTowerId: towerId,
    });
    void events;
  });

  it('TC-WIZ-003: 塔顶巫师移动到空地', () => {
    const { state } = newGame(2);
    clearSpace(state, 6);
    const towerId = state.board.spaces[3]!.towerStack[0]!;
    placeWizardOnTower(state, 'W_P1_01', 3, towerId);
    const { emit } = mkApplyEmit(state);
    moveWizardExact(state, 'P1', 'W_P1_01', 3, 'MOVEMENT_CARD', {}, emit);
    // 3 -> 6
    expect(state.wizards['W_P1_01']!.state).toEqual({ mode: 'ON_GROUND', spaceIndex: 6 });
  });

  it('TC-WIZ-004: 巫师刚好进入乌鸦城堡', () => {
    const { state } = newGame(2);
    placeCastleOnSpace(state, 8);
    placeWizardOnGround(state, 'W_P1_01', 6);
    clearSpace(state, 7); // 中间无干扰
    const { emit } = mkApplyEmit(state);
    const r = moveWizardExact(state, 'P1', 'W_P1_01', 2, 'MOVEMENT_CARD', {}, emit);
    expect(r.enteredCastle).toBe(true);
    expect(state.wizards['W_P1_01']!.state.mode).toBe(WizardStateType.IN_CASTLE);
    expect(state.ravenCastle.wizardIdsInside).toContain('W_P1_01');
    assertInvariants(state);
  });

  it('TC-WIZ-005: 步数超过城堡，不中途进入', () => {
    const { state } = newGame(2);
    placeCastleOnSpace(state, 8);
    placeWizardOnGround(state, 'W_P1_01', 6);
    clearSpace(state, 7);
    clearSpace(state, 9);
    const { emit } = mkApplyEmit(state);
    moveWizardExact(state, 'P1', 'W_P1_01', 3, 'MOVEMENT_CARD', {}, emit);
    // 6 + 3 = 9，越过城堡 8
    expect(state.wizards['W_P1_01']!.state).toEqual({ mode: 'ON_GROUND', spaceIndex: 9 });
    expect(state.ravenCastle.wizardIdsInside).not.toContain('W_P1_01');
  });

  it('TC-WIZ-006: 被封印巫师不能作为普通巫师牌目标', () => {
    const { state } = newGame(2);
    const towerId = state.board.spaces[2]!.towerStack[0] ?? 'T01';
    imprisonWizard(state, 'W_P1_01', 2, towerId);
    const { emit } = mkApplyEmit(state);
    expect(() => moveWizardExact(state, 'P1', 'W_P1_01', 1, 'MOVEMENT_CARD', {}, emit)).toThrow(RuleError);
    try {
      moveWizardExact(state, 'P1', 'W_P1_01', 1, 'MOVEMENT_CARD', {}, emit);
    } catch (e) {
      expect((e as RuleError).code).toBe(RuleErrorCode.INVALID_WIZARD_TARGET);
    }
  });

  it('TC-WIZ-007: 目标落点超过 6 名可见巫师', () => {
    const { state } = newGame(6); // 6 人局
    clearSpace(state, 5);
    // 在 space 5 放 6 名地面可见巫师
    const wizards = ['W_P1_01', 'W_P2_01', 'W_P3_01', 'W_P4_01', 'W_P5_01', 'W_P6_01'];
    for (const wid of wizards) placeWizardOnGround(state, wid, 5);
    placeWizardOnGround(state, 'W_P1_02', 2);
    const { emit } = mkApplyEmit(state);
    expect(() => moveWizardExact(state, 'P1', 'W_P1_02', 3, 'MOVEMENT_CARD', {}, emit)).toThrow(RuleError);
  });

  it('TC-WIZ-008(部分): 进入城堡返回 enteredCastle=true（回合结束由引擎处理）', () => {
    const { state } = newGame(2);
    placeCastleOnSpace(state, 8);
    placeWizardOnGround(state, 'W_P1_01', 6);
    clearSpace(state, 7);
    const { emit } = mkApplyEmit(state);
    const r = moveWizardExact(state, 'P1', 'W_P1_01', 2, 'MOVEMENT_CARD', {}, emit);
    expect(r.enteredCastle).toBe(true);
  });

  it('不允许移动别人的巫师（普通牌）', () => {
    const { state } = newGame(2);
    placeWizardOnGround(state, 'W_P2_01', 2);
    clearSpace(state, 5);
    const { emit } = mkApplyEmit(state);
    expect(() => moveWizardExact(state, 'P1', 'W_P2_01', 3, 'MOVEMENT_CARD', {}, emit)).toThrow(RuleError);
  });

  it('法术模式 allowAnyOwner 可移动任意可见巫师', () => {
    const { state } = newGame(2);
    placeWizardOnGround(state, 'W_P2_01', 2);
    clearSpace(state, 5);
    const { emit } = mkApplyEmit(state);
    const r = moveWizardExact(state, 'P1', 'W_P2_01', 3, 'SPELL', { allowAnyOwner: true }, emit);
    expect(r.enteredCastle).toBe(false);
    expect(state.wizards['W_P2_01']!.state).toEqual({ mode: 'ON_GROUND', spaceIndex: 5 });
  });

  void onTower;
});
