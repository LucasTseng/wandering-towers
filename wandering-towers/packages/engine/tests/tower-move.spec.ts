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

  it('切片内塔封印的巫师随塔移走时解封回源空间（V2 §14.5）', () => {
    // 场景：空间 4 stack=[T01, T02, T03]，T02 内 IMPRISONED 着 W_P2_01（封入时就在空间 4）。
    // 移走 T02（slice=[T02]）顺时针 2 格 → 源空间 stack=[T01, T03]，
    // 按 V2 §14.5 封印塔（T02）被移走使 W 重新暴露 → 解封到源空间留下的最顶塔 T03。
    const { state } = newGame(2);
    stackTowers(state, 4, ['T01', 'T02', 'T03']);
    clearSpace(state, 6);
    const w = state.wizards['W_P2_01']!;
    w.state = { mode: WizardStateType.IMPRISONED, spaceIndex: 4, insideTowerId: 'T02' };
    state.towers['T02']!.imprisonedWizards.push('W_P2_01');
    const { emit } = mkApplyEmit(state);
    moveTowerSegment(state, 'P1', 4, 'T02', 2, 'MOVEMENT_CARD', emit);
    // 期望：W 解封到源空间最顶塔 T01 顶（slice=[T02, T03] 移走，源空间留 T01）
    expect(state.wizards['W_P2_01']!.state).toMatchObject({
      mode: WizardStateType.ON_TOWER_TOP,
      spaceIndex: 4,
      topTowerId: 'T01',
    });
    expect(state.towers['T02']!.imprisonedWizards).not.toContain('W_P2_01');
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

describe('E1 源塔解封（V4 §14.6 releaseVisibleWizardsAtSource）', () => {
  it('切片移走后源塔 T01 内的封印巫师应解封到 T01 顶', () => {
    const { state } = newGame(2);
    stackTowers(state, 4, ['T01', 'T02']);
    clearSpace(state, 6);
    // 清理 T01 顶的初始巫师以清晰测试
    state.board.spaces[4]!.groundVisibleWizards.length = 0;
    for (const tw of Object.values(state.towers)) {
      tw.imprisonedWizards.length = 0;
    }
    // 手动设置：T01 内有 IMPRISONED 巫师
    const w = state.wizards['W_P2_01']!;
    w.state = { mode: WizardStateType.IMPRISONED, spaceIndex: 4, insideTowerId: 'T01' };
    state.towers['T01']!.imprisonedWizards.push('W_P2_01');
    const { events, emit } = mkApplyEmit(state);
    // 移动 T02（slice=[T02]）到 space 6
    moveTowerSegment(state, 'P1', 4, 'T02', 2, 'MOVEMENT_CARD', emit);
    // 期望：T01 留下，T01 顶的 IMPRISONED 巫师应解封到 T01 顶
    expect(state.wizards['W_P2_01']!.state).toMatchObject({
      mode: WizardStateType.ON_TOWER_TOP,
      spaceIndex: 4,
      topTowerId: 'T01',
    });
    expect(state.towers['T01']!.imprisonedWizards).not.toContain('W_P2_01');
    // 事件流应包含 WIZARD_RELEASED
    expect(events.some((e) => e.type === 'WIZARD_RELEASED')).toBe(true);
  });
});

describe('E2 覆盖塔移走时塔内巫师解封（V2 §14.5）', () => {
  it('切片 [覆盖塔] 移走后，塔内 IMPRISONED 巫师应解封到原空间留下的最顶塔', () => {
    // 场景：空间 1 stack=[T01]，T01 顶有 W_P1_01 ON_TOWER_TOP。
    // T05 从空间 3 落到空间 1 覆盖 T01 → W_P1_01 被封进 T05（V2 §14.1）。
    // 空间 1 stack 变成 [T01, T05]，W_P1_01.state = IMPRISONED, insideTowerId=T05。
    // 移走 T05（slice=[T05]）→ 源空间 stack=[T01]，W_P1_01 应解封到 T01 顶。
    const { state } = newGame(2);
    state.board.spaces[1]!.groundVisibleWizards = [];
    placeWizardOnTower(state, 'W_P1_01', 1, 'T01');
    setSingleTower(state, 3, 'T05');

    // T05 落到空间 1（顺时针 14 格：3+14=17 mod 16=1）
    const { emit } = mkApplyEmit(state);
    moveTowerSegment(state, 'P2', 3, 'T05', 14, 'MOVEMENT_CARD', emit);

    expect(state.board.spaces[1]!.towerStack).toEqual(['T01', 'T05']);
    expect(state.wizards['W_P1_01']!.state.mode).toBe(WizardStateType.IMPRISONED);
    expect((state.wizards['W_P1_01']!.state as { insideTowerId: string }).insideTowerId).toBe('T05');
    expect(state.towers['T05']!.imprisonedWizards).toContain('W_P1_01');

    // 移走 T05（slice=[T05]）顺时针 1 格到空间 2
    const { emit: emit2 } = mkApplyEmit(state);
    moveTowerSegment(state, 'P1', 1, 'T05', 1, 'MOVEMENT_CARD', emit2);

    // 期望：W_P1_01 解封到 T01 顶（ON_TOWER_TOP @ 空间 1, topTowerId=T01）
    expect(state.board.spaces[1]!.towerStack).toEqual(['T01']);
    expect(state.wizards['W_P1_01']!.state.mode).toBe(WizardStateType.ON_TOWER_TOP);
    const wState = state.wizards['W_P1_01']!.state as { spaceIndex: number; topTowerId: string };
    expect(wState.spaceIndex).toBe(1);
    expect(wState.topTowerId).toBe('T01');
    expect(state.towers['T05']!.imprisonedWizards).not.toContain('W_P1_01');
    assertInvariants(state);
  });
});
