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

  it('TC-SEAL-002: 塔盖住塔顶巫师 -> 封进被覆盖塔（Model B）', () => {
    const { state } = newGame(2);
    setSingleTower(state, 3, 'T01');
    setSingleTower(state, 5, 'T02');
    placeWizardOnTower(state, 'W_P2_01', 5, 'T02');
    const { emit } = mkApplyEmit(state);
    const r = moveTowerSegment(state, 'P1', 3, 'T01', 2, 'MOVEMENT_CARD', emit);
    expect(r.imprisonmentHappened).toBe(true);
    expect(state.wizards['W_P2_01']!.state.mode).toBe(WizardStateType.IMPRISONED);
    // Model B：塔顶巫师封进它原本站立的被覆盖塔 T02（非覆盖塔 T01），跟随 T02
    expect(state.wizards['W_P2_01']!.state).toMatchObject({ insideTowerId: 'T02', sealedAs: 'COVERED_TOWER' });
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

  it('切片内被覆盖塔的 COVERED_TOWER 封印随切片移动、保持封印（Model B）', () => {
    // 场景：空间 4 stack=[T01, T02, T03]，T02 内 COVERED_TOWER 封印着 W_P2_01
    //   （W 原站在 T02 顶，被 T03 覆盖而封进 T02，跟随 T02）。
    // 移走 T02（slice=[T02, T03]）顺时针 2 格 → space 6。
    // Model B：W 随 T02 走、保持封印（T02 在切片内仍被 T03 压着，未成顶层 → 不解封）。
    const { state } = newGame(2);
    stackTowers(state, 4, ['T01', 'T02', 'T03']);
    clearSpace(state, 6);
    const w = state.wizards['W_P2_01']!;
    w.state = { mode: WizardStateType.IMPRISONED, spaceIndex: 4, insideTowerId: 'T02', sealedAs: 'COVERED_TOWER' };
    state.towers['T02']!.imprisonedWizards.push('W_P2_01');
    const { emit } = mkApplyEmit(state);
    moveTowerSegment(state, 'P1', 4, 'T02', 2, 'MOVEMENT_CARD', emit);
    // 期望：W 仍封印在 T02，且随切片到了 space 6
    expect(state.wizards['W_P2_01']!.state).toMatchObject({
      mode: WizardStateType.IMPRISONED,
      spaceIndex: 6,
      insideTowerId: 'T02',
      sealedAs: 'COVERED_TOWER',
    });
    expect(state.towers['T02']!.imprisonedWizards).toContain('W_P2_01');
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
    // 手动设置：T01 内有 IMPRISONED 巫师（COVERED_TOWER 封印）
    const w = state.wizards['W_P2_01']!;
    w.state = { mode: WizardStateType.IMPRISONED, spaceIndex: 4, insideTowerId: 'T01', sealedAs: 'COVERED_TOWER' };
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

describe('E2 被覆盖塔重新成顶时塔内巫师解封（Model B）', () => {
  it('覆盖塔移走后，被覆盖塔 T01 重新成顶 → 其内 COVERED_TOWER 封印巫师解封到 T01 顶', () => {
    // 场景：空间 1 stack=[T01]，T01 顶有 W_P1_01 ON_TOWER_TOP。
    // T05 从空间 3 落到空间 1 覆盖 T01 → W_P1_01 被封进被覆盖塔 T01（Model B，跟随 T01）。
    // 空间 1 stack 变成 [T01, T05]，W_P1_01.state = IMPRISONED, insideTowerId=T01, sealedAs=COVERED_TOWER。
    // 移走 T05（slice=[T05]）→ 源空间 stack=[T01]，T01 重新成顶 → W_P1_01 解封到 T01 顶。
    const { state } = newGame(2);
    state.board.spaces[1]!.groundVisibleWizards = [];
    placeWizardOnTower(state, 'W_P1_01', 1, 'T01');
    setSingleTower(state, 3, 'T05');

    // T05 落到空间 1（顺时针 14 格：3+14=17 mod 16=1）
    const { emit } = mkApplyEmit(state);
    moveTowerSegment(state, 'P2', 3, 'T05', 14, 'MOVEMENT_CARD', emit);

    expect(state.board.spaces[1]!.towerStack).toEqual(['T01', 'T05']);
    expect(state.wizards['W_P1_01']!.state.mode).toBe(WizardStateType.IMPRISONED);
    expect((state.wizards['W_P1_01']!.state as { insideTowerId: string }).insideTowerId).toBe('T01');
    expect(state.towers['T01']!.imprisonedWizards).toContain('W_P1_01');

    // 移走 T05（slice=[T05]）顺时针 1 格到空间 2
    const { emit: emit2 } = mkApplyEmit(state);
    moveTowerSegment(state, 'P1', 1, 'T05', 1, 'MOVEMENT_CARD', emit2);

    // 期望：W_P1_01 解封到 T01 顶（ON_TOWER_TOP @ 空间 1, topTowerId=T01）
    expect(state.board.spaces[1]!.towerStack).toEqual(['T01']);
    expect(state.wizards['W_P1_01']!.state.mode).toBe(WizardStateType.ON_TOWER_TOP);
    const wState = state.wizards['W_P1_01']!.state as { spaceIndex: number; topTowerId: string };
    expect(wState.spaceIndex).toBe(1);
    expect(wState.topTowerId).toBe('T01');
    expect(state.towers['T01']!.imprisonedWizards).not.toContain('W_P1_01');
    assertInvariants(state);
  });
});

describe('TC-SEAL-006 用户三步例子（Model B 封印归属与解封）', () => {
  // 起始：M1-T1[W1]、M2-T2[W2]、M3-T3[W3]（M=space 1/2/3）
  // 1) T1 走 1 格 → M2-T2[W2]-T1[W1]（W2 封进被覆盖塔 T2，W1 在顶）
  // 2) 整叠 [T2,T1] 走 1 格盖 T3 → M3-T3[W3]-T2[W2]-T1[W1]（W3 封进 T3，W2 随 T2，W1 在顶）
  // 3) T2（切片 [T2,T1]）走 2 格 → M3-T3[W3]、M5-T2[W2]-T1[W1]（W3 解封，W2 仍封印）
  it('三步序列：封印归属被覆盖塔，被覆盖塔重新成顶时解封', () => {
    const { state } = newGame(2);
    // 清场：所有巫师移入城堡，同步 castle.inside
    for (const w of Object.values(state.wizards)) {
      if (w.state.mode === WizardStateType.ON_GROUND) {
        const sp = state.board.spaces[w.state.spaceIndex]!;
        sp.groundVisibleWizards = sp.groundVisibleWizards.filter((id) => id !== w.id);
      }
      w.state = { mode: WizardStateType.IN_CASTLE };
    }
    state.ravenCastle.wizardIdsInside = Object.keys(state.wizards);
    // T01/T02/T03 已在 space 1/2/3；清空 space 5 作为第 3 步落点
    clearSpace(state, 5);
    const put = (wid: string, sp: number, tid: string) => {
      const i = state.ravenCastle.wizardIdsInside.indexOf(wid);
      if (i >= 0) state.ravenCastle.wizardIdsInside.splice(i, 1);
      state.wizards[wid]!.state = { mode: WizardStateType.ON_TOWER_TOP, spaceIndex: sp, topTowerId: tid };
    };
    put('W_P1_01', 1, 'T01'); // W1
    put('W_P1_02', 2, 'T02'); // W2
    put('W_P1_03', 3, 'T03'); // W3

    // 第 1 步：T01 从 space 1 走 1 格到 space 2，覆盖 T02
    const { emit: e1 } = mkApplyEmit(state);
    moveTowerSegment(state, 'P1', 1, 'T01', 1, 'MOVEMENT_CARD', e1);
    expect(state.board.spaces[1]!.towerStack).toEqual([]);
    expect(state.board.spaces[2]!.towerStack).toEqual(['T02', 'T01']);
    expect(state.wizards['W_P1_02']!.state).toMatchObject({
      mode: WizardStateType.IMPRISONED, insideTowerId: 'T02', sealedAs: 'COVERED_TOWER',
    });
    expect(state.wizards['W_P1_01']!.state).toMatchObject({
      mode: WizardStateType.ON_TOWER_TOP, spaceIndex: 2, topTowerId: 'T01',
    });
    assertInvariants(state);

    // 第 2 步：整叠 [T02,T01]（自 space 2 取 T02）走 1 格到 space 3，覆盖 T03
    const { emit: e2 } = mkApplyEmit(state);
    moveTowerSegment(state, 'P1', 2, 'T02', 1, 'MOVEMENT_CARD', e2);
    expect(state.board.spaces[2]!.towerStack).toEqual([]);
    expect(state.board.spaces[3]!.towerStack).toEqual(['T03', 'T02', 'T01']);
    expect(state.wizards['W_P1_03']!.state).toMatchObject({
      mode: WizardStateType.IMPRISONED, insideTowerId: 'T03', sealedAs: 'COVERED_TOWER',
    });
    // W2 仍封印在 T02，随切片到了 space 3
    expect(state.wizards['W_P1_02']!.state).toMatchObject({
      mode: WizardStateType.IMPRISONED, spaceIndex: 3, insideTowerId: 'T02', sealedAs: 'COVERED_TOWER',
    });
    expect(state.wizards['W_P1_01']!.state).toMatchObject({
      mode: WizardStateType.ON_TOWER_TOP, spaceIndex: 3, topTowerId: 'T01',
    });
    assertInvariants(state);

    // 第 3 步：T02（切片 [T02,T01]，自 space 3）走 2 格到 space 5
    const { emit: e3 } = mkApplyEmit(state);
    moveTowerSegment(state, 'P1', 3, 'T02', 2, 'MOVEMENT_CARD', e3);
    // space 3 剩 T03，T03 重新成顶 → W3 解封到 T03 顶
    expect(state.board.spaces[3]!.towerStack).toEqual(['T03']);
    expect(state.wizards['W_P1_03']!.state).toMatchObject({
      mode: WizardStateType.ON_TOWER_TOP, spaceIndex: 3, topTowerId: 'T03',
    });
    // space 5 = [T02, T01]；W2 仍封印在 T02（T02 仍被 T01 压着），W1 在顶
    expect(state.board.spaces[5]!.towerStack).toEqual(['T02', 'T01']);
    expect(state.wizards['W_P1_02']!.state).toMatchObject({
      mode: WizardStateType.IMPRISONED, spaceIndex: 5, insideTowerId: 'T02', sealedAs: 'COVERED_TOWER',
    });
    expect(state.wizards['W_P1_01']!.state).toMatchObject({
      mode: WizardStateType.ON_TOWER_TOP, spaceIndex: 5, topTowerId: 'T01',
    });
    assertInvariants(state);
  });
});
