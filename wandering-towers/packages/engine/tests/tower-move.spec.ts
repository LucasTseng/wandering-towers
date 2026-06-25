import { describe, it, expect } from 'vitest';
import { WizardStateType } from '@wt/shared';
import { moveTowerSegment } from '../src/rules/move-tower';
import { RuleError } from '../src/rule-error';
import { RuleErrorCode } from '@wt/shared';
import { assertInvariants } from '../src/invariants';
import {
  newGame,
  clearSpace,
  setSingleTower,
  stackTowers,
  placeWizardOnGround,
  placeWizardOnTower,
  placeCastleOnSpace,
  placeCastleOnTower,
  mkApplyEmit,
} from './helpers';

describe('TC-TOWER 塔移动', () => {
  it('TC-TOWER-001: 单塔移动到空位', () => {
    const { state } = newGame(2);
    // 把 T01 单独放 space 3，space 5 清空
    setSingleTower(state, 3, 'T01');
    clearSpace(state, 5);
    const { emit } = mkApplyEmit(state);
    moveTowerSegment(state, 'P1', 3, 'T01', 2, 'MOVEMENT_CARD', emit);
    expect(state.board.spaces[3]!.towerStack).toEqual([]);
    expect(state.board.spaces[5]!.towerStack).toEqual(['T01']);
  });

  it('TC-TOWER-002: 单塔移动到已有塔位置 -> 叠塔 [T2,T1]', () => {
    const { state } = newGame(2);
    setSingleTower(state, 3, 'T01');
    setSingleTower(state, 5, 'T02');
    const { emit } = mkApplyEmit(state);
    moveTowerSegment(state, 'P1', 3, 'T01', 2, 'MOVEMENT_CARD', emit);
    expect(state.board.spaces[5]!.towerStack).toEqual(['T02', 'T01']); // bottom->top
  });

  it('TC-TOWER-003: 三层塔堆 [A,B,C] 只移动顶塔 C', () => {
    const { state } = newGame(2);
    stackTowers(state, 4, ['T01', 'T02', 'T03']);
    clearSpace(state, 6);
    const { emit } = mkApplyEmit(state);
    moveTowerSegment(state, 'P1', 4, 'T03', 2, 'MOVEMENT_CARD', emit);
    expect(state.board.spaces[4]!.towerStack).toEqual(['T01', 'T02']);
    expect(state.board.spaces[6]!.towerStack).toEqual(['T03']);
  });

  it('TC-TOWER-004: 三层塔堆 [A,B,C] 移动中间塔 B 及上方 [B,C]', () => {
    const { state } = newGame(2);
    stackTowers(state, 4, ['T01', 'T02', 'T03']);
    clearSpace(state, 6);
    const { emit } = mkApplyEmit(state);
    moveTowerSegment(state, 'P1', 4, 'T02', 2, 'MOVEMENT_CARD', emit);
    expect(state.board.spaces[4]!.towerStack).toEqual(['T01']);
    expect(state.board.spaces[6]!.towerStack).toEqual(['T02', 'T03']);
  });

  it('TC-TOWER-005: 移动整叠塔 [A,B,C]', () => {
    const { state } = newGame(2);
    stackTowers(state, 4, ['T01', 'T02', 'T03']);
    clearSpace(state, 6);
    const { emit } = mkApplyEmit(state);
    moveTowerSegment(state, 'P1', 4, 'T01', 2, 'MOVEMENT_CARD', emit);
    expect(state.board.spaces[4]!.towerStack).toEqual([]);
    expect(state.board.spaces[6]!.towerStack).toEqual(['T01', 'T02', 'T03']);
  });

  it('TC-TOWER-006: 乌鸦城堡在被移动塔上时随塔移动', () => {
    const { state } = newGame(2);
    stackTowers(state, 4, ['T01', 'T02', 'T03']);
    clearSpace(state, 6);
    // 城堡站在切片顶塔 T03 上
    placeCastleOnTower(state, 4, 'T03');
    const { emit } = mkApplyEmit(state);
    const r = moveTowerSegment(state, 'P1', 4, 'T02', 2, 'MOVEMENT_CARD', emit);
    expect(r.ravenCastleMovedWithSlice).toBe(true);
    expect(state.ravenCastle.position).toEqual({ mode: 'ON_TOWER', spaceIndex: 6, topTowerId: 'T03' });
  });

  it('TC-TOWER-007: 塔不能移动到乌鸦城堡所在位置压住城堡', () => {
    const { state } = newGame(2);
    setSingleTower(state, 3, 'T01');
    placeCastleOnSpace(state, 5); // 城堡在地面 space 5
    const { emit } = mkApplyEmit(state);
    expect(() => moveTowerSegment(state, 'P1', 3, 'T01', 2, 'MOVEMENT_CARD', emit)).toThrow(RuleError);
    try {
      moveTowerSegment(state, 'P1', 3, 'T01', 2, 'MOVEMENT_CARD', emit);
    } catch (e) {
      expect((e as RuleError).code).toBe(RuleErrorCode.TOWER_CANNOT_LAND_ON_CASTLE);
    }
  });
});

describe('TC-SEAL 封印 / 解封', () => {
  it('TC-SEAL-001: 塔盖住地面巫师 -> 封印', () => {
    const { state } = newGame(2);
    setSingleTower(state, 3, 'T01');
    clearSpace(state, 5);
    placeWizardOnGround(state, 'W_P2_01', 5);
    const { emit } = mkApplyEmit(state);
    const r = moveTowerSegment(state, 'P1', 3, 'T01', 2, 'MOVEMENT_CARD', emit);
    expect(r.imprisonmentHappened).toBe(true);
    expect(state.wizards['W_P2_01']!.state.mode).toBe(WizardStateType.IMPRISONED);
    expect(state.wizards['W_P2_01']!.state).toMatchObject({ insideTowerId: 'T01', spaceIndex: 5 });
    expect(state.towers['T01']!.imprisonedWizards).toContain('W_P2_01');
    assertInvariants(state);
  });

  it('TC-SEAL-002: 塔盖住塔顶巫师 -> 封印', () => {
    const { state } = newGame(2);
    setSingleTower(state, 3, 'T01');
    setSingleTower(state, 5, 'T02');
    placeWizardOnTower(state, 'W_P2_01', 5, 'T02');
    const { emit } = mkApplyEmit(state);
    const r = moveTowerSegment(state, 'P1', 3, 'T01', 2, 'MOVEMENT_CARD', emit);
    expect(r.imprisonmentHappened).toBe(true);
    expect(state.wizards['W_P2_01']!.state.mode).toBe(WizardStateType.IMPRISONED);
    // 切片底塔 T01 负责封印
    expect(state.wizards['W_P2_01']!.state).toMatchObject({ insideTowerId: 'T01' });
  });

  it('TC-SEAL-003: 一次封印多个巫师，imprisonmentHappened 仍 true（奖励由调用方翻 1 瓶）', () => {
    const { state } = newGame(4);
    setSingleTower(state, 3, 'T01');
    clearSpace(state, 5);
    placeWizardOnGround(state, 'W_P2_01', 5);
    placeWizardOnGround(state, 'W_P3_01', 5);
    const { emit } = mkApplyEmit(state);
    const r = moveTowerSegment(state, 'P1', 3, 'T01', 2, 'MOVEMENT_CARD', emit);
    expect(r.imprisonmentHappened).toBe(true);
    expect(state.towers['T01']!.imprisonedWizards).toHaveLength(2);
  });

  it('封印随塔移动：切片内塔封印的巫师 spaceIndex 更新到 dest', () => {
    const { state } = newGame(2);
    stackTowers(state, 4, ['T01', 'T02', 'T03']);
    clearSpace(state, 6);
    // T02 内封印一名巫师
    const w = state.wizards['W_P2_01']!;
    w.state = { mode: WizardStateType.IMPRISONED, spaceIndex: 4, insideTowerId: 'T02' };
    state.towers['T02']!.imprisonedWizards.push('W_P2_01');
    const { emit } = mkApplyEmit(state);
    moveTowerSegment(state, 'P1', 4, 'T02', 2, 'MOVEMENT_CARD', emit);
    expect(state.wizards['W_P2_01']!.state).toMatchObject({ mode: 'IMPRISONED', spaceIndex: 6, insideTowerId: 'T02' });
    assertInvariants(state);
  });

  it('封印后塔顶巫师随切片移动到 dest 空间', () => {
    const { state } = newGame(2);
    stackTowers(state, 4, ['T01', 'T02', 'T03']);
    clearSpace(state, 6);
    placeWizardOnTower(state, 'W_P1_01', 4, 'T03');
    const { emit } = mkApplyEmit(state);
    moveTowerSegment(state, 'P1', 4, 'T02', 2, 'MOVEMENT_CARD', emit);
    expect(state.wizards['W_P1_01']!.state).toMatchObject({
      mode: 'ON_TOWER_TOP',
      spaceIndex: 6,
      topTowerId: 'T03',
    });
  });
});
