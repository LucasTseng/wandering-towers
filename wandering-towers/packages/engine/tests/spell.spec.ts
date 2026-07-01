import { describe, it, expect } from 'vitest';
import { RuleEngine } from '../src/rule-engine';
import { RuleError } from '../src/rule-error';
import { RuleErrorCode, WizardStateType } from '@wt/shared';
import { customConfig } from './fixtures';
import { placeWizardOnGround, setPotions, setSingleTower, clearSpace, imprisonWizard, stackTowers } from './helpers';
import type { ActionCommand, GameState } from '@wt/shared';

const ALL_SPELLS = [
  'MOVE_WIZARD_1',
  'MOVE_TOWER_2',
  'FREE_A_WIZARD',
  'MOVE_RAVEN_CASTLE',
  'SWAP_TWO_TOWERS',
  'DRAW_CARD',
  'REUSE_LAST_CARD',
];

function cmd(playerId: string, spellId: string, targetDecision: unknown, seq = 1): ActionCommand {
  return {
    commandId: `CMD_${seq}`,
    playerId,
    type: 'CAST_SPELL',
    payload: { spellId, targetDecision } as ActionCommand['payload'],
  };
}

/** CUSTOM 模式 + 全部 7 法术 + 每回合最多 1 次 */
function mkEngine(spells = ALL_SPELLS, maxSpellsPerTurn = 1, seed = 7): RuleEngine {
  return new RuleEngine(customConfig(2, spells, { seed, maxSpellsPerTurn }));
}

/** 给 P1 设置满瓶（默认全部满） */
function giveFullPotions(state: GameState, playerId = 'P1', fullCount = 6): void {
  const states = Array.from({ length: 6 }, (_, i) => (i < fullCount ? 'FULL' : 'EMPTY'));
  setPotions(state, playerId, states as GameState['potions'][string]['state'][]);
}

/** 统计某玩家已消耗（SPENT）的药水数 */
function spentPotions(engine: RuleEngine, playerId = 'P1'): number {
  return engine.state.players[playerId]!.potionIds.filter(
    (p) => engine.state.potions[p]!.state === 'SPENT',
  ).length;
}

describe('TC-SPELL 法术系统', () => {
  it('TC-SPELL-001: 每回合施法上限 -> 第二次 SPELL_LIMIT_REACHED', () => {
    const engine = mkEngine(['MOVE_RAVEN_CASTLE'], 1);
    giveFullPotions(engine.state);
    // 第一次施法成功（MOVE_RAVEN_CASTLE 无目标）
    const r1 = engine.execute(cmd('P1', 'MOVE_RAVEN_CASTLE', {}));
    expect(r1.success).toBe(true);
    // 第二次应被拒
    try {
      engine.execute(cmd('P1', 'MOVE_RAVEN_CASTLE', {}, 2));
      throw new Error('should have thrown');
    } catch (e) {
      expect((e as RuleError).code).toBe(RuleErrorCode.SPELL_LIMIT_REACHED);
    }
  });

  it('TC-SPELL-002/003: ACTION_1 / ACTION_2 / ACTION_DONE 阶段均可施法', () => {
    for (const phase of ['ACTION_1', 'ACTION_2', 'ACTION_DONE'] as const) {
      const engine = mkEngine(['MOVE_RAVEN_CASTLE']);
      giveFullPotions(engine.state);
      engine.state.turnPhase = phase as GameState['turnPhase'];
      const r = engine.execute(cmd('P1', 'MOVE_RAVEN_CASTLE', {}));
      expect(r.success).toBe(true);
      expect(r.events.some((e) => e.type === 'SPELL_CAST')).toBe(true);
      // ACTION_DONE 施法不应结束回合（仍待玩家显式 END_TURN）
      expect(r.endTurn).toBe(false);
    }
  });

  it('TC-SPELL-004: 满瓶不足 -> NOT_ENOUGH_FULL_POTIONS', () => {
    const engine = mkEngine(['MOVE_RAVEN_CASTLE']);
    // 全部空瓶（0 满）
    setPotions(engine.state, 'P1', ['EMPTY', 'EMPTY', 'EMPTY', 'EMPTY', 'EMPTY', 'EMPTY'] as never);
    try {
      engine.execute(cmd('P1', 'MOVE_RAVEN_CASTLE', {}));
      throw new Error('should have thrown');
    } catch (e) {
      expect((e as RuleError).code).toBe(RuleErrorCode.NOT_ENOUGH_FULL_POTIONS);
    }
  });

  it('TC-SPELL-005: MOVE_WIZARD_1 复用 moveWizardExact（顺时针 1 格）', () => {
    const engine = mkEngine(['MOVE_WIZARD_1']);
    giveFullPotions(engine.state);
    const wid = engine.state.players['P1']!.wizardIds[0]!;
    // space 10/11 在标准局无塔，落点为地面
    placeWizardOnGround(engine.state, wid, 10);
    const toIndex = 11; // 顺时针 1 格
    const r = engine.execute(cmd('P1', 'MOVE_WIZARD_1', { wizardId: wid, targetSpaceIndex: toIndex }));
    expect(r.success).toBe(true);
    expect(engine.state.wizards[wid]!.state).toMatchObject({ mode: 'ON_GROUND', spaceIndex: 11 });
    expect(r.events.some((e) => e.type === 'WIZARD_MOVED')).toBe(true);
    // 药水消耗 1 瓶
    expect(engine.state.players['P1']!.potionIds.filter((p) => engine.state.potions[p]!.state === 'SPENT').length).toBe(1);
  });

  it('TC-SPELL-005b: MOVE_WIZARD_1 目标格非顺时针 1 格 -> INVALID_SPELL_TARGET', () => {
    const engine = mkEngine(['MOVE_WIZARD_1']);
    giveFullPotions(engine.state);
    const wid = engine.state.players['P1']!.wizardIds[0]!;
    placeWizardOnGround(engine.state, wid, 10);
    // 逆时针 1 格（9）非法
    expect(() => engine.execute(cmd('P1', 'MOVE_WIZARD_1', { wizardId: wid, targetSpaceIndex: 9 }))).toThrow(RuleError);
  });

  it('TC-SPELL-006: MOVE_TOWER_2 复用 moveTowerSegment（移动 2 格）', () => {
    const engine = mkEngine(['MOVE_TOWER_2']);
    giveFullPotions(engine.state);
    // 找一座可移动的塔（非乌鸦堡所在），放到 space 10（空位）
    const movableTower = Object.keys(engine.state.towers).find((id) => id !== 'T01')!;
    setSingleTower(engine.state, 10, movableTower);
    const r = engine.execute(
      cmd('P1', 'MOVE_TOWER_2', { towerSourceSpaceIndex: 10, pickedTowerId: movableTower, steps: 2 }),
    );
    expect(r.success).toBe(true);
    expect(r.events.some((e) => e.type === 'TOWER_SLICE_MOVED')).toBe(true);
    // 塔应移动到 space 12（顺时针 2 格）
    expect(engine.state.board.spaces[12]!.towerStack).toContain(movableTower);
  });

  it('TC-SPELL-006b: MOVE_TOWER_2 步数非法（3）-> INVALID_SPELL_TARGET', () => {
    const engine = mkEngine(['MOVE_TOWER_2']);
    giveFullPotions(engine.state);
    const movableTower = Object.keys(engine.state.towers).find((id) => id !== 'T01')!;
    setSingleTower(engine.state, 10, movableTower);
    expect(() =>
      engine.execute(cmd('P1', 'MOVE_TOWER_2', { towerSourceSpaceIndex: 10, pickedTowerId: movableTower, steps: 3 })),
    ).toThrow(RuleError);
  });

  it('TC-SPELL-007: 法术致巫师进堡 -> 立即结束回合', () => {
    const engine = mkEngine(['MOVE_WIZARD_1']);
    giveFullPotions(engine.state);
    const wid = engine.state.players['P1']!.wizardIds[0]!;
    // 把乌鸦堡放到 space 6，巫师放 space 5，MOVE_WIZARD_1 顺时针 1 格进堡
    const castleSpace = 6;
    engine.state.ravenCastle.position = { mode: 'ON_SPACE', spaceIndex: castleSpace };
    engine.state.ravenCastle.wizardIdsInside = [];
    placeWizardOnGround(engine.state, wid, 5);
    const r = engine.execute(cmd('P1', 'MOVE_WIZARD_1', { wizardId: wid, targetSpaceIndex: castleSpace }));
    expect(r.success).toBe(true);
    expect(r.endTurn).toBe(true); // 进堡立即结束回合
    expect(engine.state.wizards[wid]!.state.mode).toBe(WizardStateType.IN_CASTLE);
    expect(engine.state.ravenCastle.wizardIdsInside).toContain(wid);
  });

  it('法术不在本局 availableSpells -> INVALID_SPELL', () => {
    const engine = mkEngine(['MOVE_RAVEN_CASTLE']); // 本局只有这一张
    giveFullPotions(engine.state);
    try {
      engine.execute(cmd('P1', 'MOVE_WIZARD_1', {}));
      throw new Error('should have thrown');
    } catch (e) {
      expect((e as RuleError).code).toBe(RuleErrorCode.INVALID_SPELL);
    }
  });

  it('非当前玩家施法 -> NOT_CURRENT_PLAYER', () => {
    const engine = mkEngine(['MOVE_RAVEN_CASTLE']);
    giveFullPotions(engine.state, 'P2');
    try {
      engine.execute(cmd('P2', 'MOVE_RAVEN_CASTLE', {}));
      throw new Error('should have thrown');
    } catch (e) {
      expect((e as RuleError).code).toBe(RuleErrorCode.NOT_CURRENT_PLAYER);
    }
  });
});

describe('TC-SPELL 各法术集成', () => {
  it('FREE_A_WIZARD: 点击封印己方巫师的塔 -> 解救到塔堆顶端', () => {
    const engine = mkEngine(['FREE_A_WIZARD']);
    giveFullPotions(engine.state);
    const wid = engine.state.players['P1']!.wizardIds[0]!;
    const towerId = 'T02';
    const towerSpace = engine.state.board.spaces.findIndex((s) => s.towerStack.includes(towerId));
    // 封印 P1 的巫师到 T02
    imprisonWizard(engine.state, wid, towerSpace, towerId, 'COVERED_TOWER');
    const r = engine.execute(
      cmd('P1', 'FREE_A_WIZARD', { towerSourceSpaceIndex: towerSpace, pickedTowerId: towerId }),
    );
    expect(r.success).toBe(true);
    expect(r.events.some((e) => e.type === 'WIZARD_RELEASED')).toBe(true);
    // 解救到该塔堆顶端（顶塔上），且从封印登记移除
    expect(engine.state.wizards[wid]!.state).toMatchObject({
      mode: WizardStateType.ON_TOWER_TOP,
      spaceIndex: towerSpace,
      topTowerId: towerId,
    });
    expect(engine.state.towers[towerId]!.imprisonedWizards).not.toContain(wid);
    // 药水消耗 1 瓶
    expect(spentPotions(engine, 'P1')).toBe(1);
  });

  it('FREE_A_WIZARD: 点错塔（塔下无己方封印巫师）-> 药水消耗但不解救', () => {
    const engine = mkEngine(['FREE_A_WIZARD']);
    giveFullPotions(engine.state);
    const towerId = 'T02';
    const towerSpace = engine.state.board.spaces.findIndex((s) => s.towerStack.includes(towerId));
    // P1 无任何被封印巫师 -> 点 T02 必然点错
    const r = engine.execute(
      cmd('P1', 'FREE_A_WIZARD', { towerSourceSpaceIndex: towerSpace, pickedTowerId: towerId }),
    );
    expect(r.success).toBe(true);
    // 不解救：无 WIZARD_RELEASED 事件
    expect(r.events.some((e) => e.type === 'WIZARD_RELEASED')).toBe(false);
    // 药水仍消耗（1 瓶）
    expect(spentPotions(engine, 'P1')).toBe(1);
  });

  it('FREE_A_WIZARD: 塔下只有对方巫师 -> 不解救（只解救己方）', () => {
    const engine = mkEngine(['FREE_A_WIZARD']);
    giveFullPotions(engine.state);
    const enemyWid = engine.state.players['P2']!.wizardIds[0]!;
    const towerId = 'T02';
    const towerSpace = engine.state.board.spaces.findIndex((s) => s.towerStack.includes(towerId));
    // 封印的是 P2 的巫师；P1 点击该塔 -> 不命中己方 -> 不解救
    imprisonWizard(engine.state, enemyWid, towerSpace, towerId, 'COVERED_TOWER');
    const r = engine.execute(
      cmd('P1', 'FREE_A_WIZARD', { towerSourceSpaceIndex: towerSpace, pickedTowerId: towerId }),
    );
    expect(r.success).toBe(true);
    expect(r.events.some((e) => e.type === 'WIZARD_RELEASED')).toBe(false);
    expect(engine.state.wizards[enemyWid]!.state.mode).toBe(WizardStateType.IMPRISONED);
    expect(spentPotions(engine, 'P1')).toBe(1);
  });

  it('FREE_A_WIZARD: 己方巫师封在底层被覆盖塔 -> 点顶层塔也能解救到顶端', () => {
    const engine = mkEngine(['FREE_A_WIZARD']);
    giveFullPotions(engine.state);
    const wid = engine.state.players['P1']!.wizardIds[0]!;
    // 在 space 10 叠 [T02(底), T03(顶)]
    stackTowers(engine.state, 10, ['T02', 'T03']);
    // P1 巫师封在底层 T02（被 T03 覆盖）
    imprisonWizard(engine.state, wid, 10, 'T02', 'COVERED_TOWER');
    // 玩家只能点到顶层 T03；引擎应检查整堆，命中底层己方巫师
    const r = engine.execute(
      cmd('P1', 'FREE_A_WIZARD', { towerSourceSpaceIndex: 10, pickedTowerId: 'T03' }),
    );
    expect(r.success).toBe(true);
    expect(r.events.some((e) => e.type === 'WIZARD_RELEASED')).toBe(true);
    // 解救到塔堆顶端 = T03 上
    expect(engine.state.wizards[wid]!.state).toMatchObject({
      mode: WizardStateType.ON_TOWER_TOP,
      spaceIndex: 10,
      topTowerId: 'T03',
    });
    expect(engine.state.towers['T02']!.imprisonedWizards).not.toContain(wid);
  });

  it('FREE_A_WIZARD: 未传塔目标 -> INVALID_SPELL_TARGET（canCast 拦截，药水未扣）', () => {
    const engine = mkEngine(['FREE_A_WIZARD']);
    giveFullPotions(engine.state);
    try {
      engine.execute(cmd('P1', 'FREE_A_WIZARD', {}));
      throw new Error('should have thrown');
    } catch (e) {
      expect((e as RuleError).code).toBe(RuleErrorCode.INVALID_SPELL_TARGET);
    }
    // canCast 在扣药水前抛错 -> 药水未消耗
    expect(spentPotions(engine, 'P1')).toBe(0);
  });

  it('MOVE_RAVEN_CASTLE: 城堡移动到下一合法乌鸦位', () => {
    const engine = mkEngine(['MOVE_RAVEN_CASTLE']);
    giveFullPotions(engine.state);
    const before = engine.state.ravenCastle.position.spaceIndex;
    const r = engine.execute(cmd('P1', 'MOVE_RAVEN_CASTLE', {}));
    expect(r.success).toBe(true);
    // 城堡应已移动（找下一乌鸦位）或原地（无合法位）；这里标准局应有合法位
    expect(r.events.some((e) => e.type === 'RAVEN_CASTLE_MOVED')).toBe(true);
    expect(engine.state.ravenCastle.position.spaceIndex).not.toBe(before);
  });

  it('SWAP_TWO_TOWERS: 交换两个空间的塔堆', () => {
    const engine = mkEngine(['SWAP_TWO_TOWERS']);
    giveFullPotions(engine.state);
    // space 10 放 T02，space 11 放 T03
    setSingleTower(engine.state, 10, 'T02');
    setSingleTower(engine.state, 11, 'T03');
    const r = engine.execute(cmd('P1', 'SWAP_TWO_TOWERS', { spaceIndex1: 10, spaceIndex2: 11 }));
    expect(r.success).toBe(true);
    expect(engine.state.board.spaces[10]!.towerStack).toContain('T03');
    expect(engine.state.board.spaces[11]!.towerStack).toContain('T02');
  });

  it('SWAP_TWO_TOWERS: 一方无塔 -> INVALID_SPELL_TARGET', () => {
    const engine = mkEngine(['SWAP_TWO_TOWERS']);
    giveFullPotions(engine.state);
    setSingleTower(engine.state, 10, 'T02');
    clearSpace(engine.state, 11); // 无塔
    expect(() => engine.execute(cmd('P1', 'SWAP_TWO_TOWERS', { spaceIndex1: 10, spaceIndex2: 11 }))).toThrow(RuleError);
  });

  it('DRAW_CARD: 从牌堆抽 1 张', () => {
    const engine = mkEngine(['DRAW_CARD']);
    giveFullPotions(engine.state);
    const before = engine.state.players['P1']!.hand.length;
    const r = engine.execute(cmd('P1', 'DRAW_CARD', {}));
    expect(r.success).toBe(true);
    expect(r.events.some((e) => e.type === 'CARDS_DRAWN')).toBe(true);
    expect(engine.state.players['P1']!.hand.length).toBe(before + 1);
  });

  it('REUSE_LAST_CARD: 复用弃牌堆顶牌（巫师移动）', () => {
    const engine = mkEngine(['REUSE_LAST_CARD']);
    giveFullPotions(engine.state);
    const wid = engine.state.players['P1']!.wizardIds[0]!;
    placeWizardOnGround(engine.state, wid, 10);
    // 弃牌堆顶放一张 W_FIX_1（巫师移动 1 格）
    const tmplMap = (engine.state as unknown as { _cardTemplates: Record<string, string> })._cardTemplates;
    const cardId = 'C_REUSE_1';
    tmplMap[cardId] = 'W_FIX_1';
    engine.state.discardPile.push(cardId);
    const r = engine.execute(
      cmd('P1', 'REUSE_LAST_CARD', { chosenMode: 'WIZARD', wizardId: wid, targetSpaceIndex: 11 }),
    );
    expect(r.success).toBe(true);
    expect(r.events.some((e) => e.type === 'WIZARD_MOVED')).toBe(true);
    expect(engine.state.wizards[wid]!.state).toMatchObject({ mode: 'ON_GROUND', spaceIndex: 11 });
  });

  it('REUSE_LAST_CARD: 弃牌堆为空 -> INVALID_SPELL_TARGET', () => {
    const engine = mkEngine(['REUSE_LAST_CARD']);
    giveFullPotions(engine.state);
    engine.state.discardPile = [];
    const wid = engine.state.players['P1']!.wizardIds[0]!;
    placeWizardOnGround(engine.state, wid, 10);
    expect(() =>
      engine.execute(cmd('P1', 'REUSE_LAST_CARD', { chosenMode: 'WIZARD', wizardId: wid })),
    ).toThrow(RuleError);
  });
});
