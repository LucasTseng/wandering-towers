import { describe, it, expect } from 'vitest';
import { RuleEngine } from '../src/rule-engine';
import { RuleError } from '../src/rule-error';
import { RuleErrorCode, TurnPhase, WizardStateType } from '@wt/shared';
import { basicConfig } from './fixtures';
import {
  newGame,
  placeWizardOnGround,
  clearSpace,
  placeCastleOnSpace,
  setPotions,
  setSingleTower,
  placeWizardOnTower,
} from './helpers';
import { buildInitialState } from '../src/state/state-builder';
import { assertInvariants } from '../src/invariants';
import { refillHand } from '../src/rules/turn-flow';
import type { ActionCommand } from '@wt/shared';

function cmd(playerId: string, type: ActionCommand['type'], payload: unknown, seq = 1): ActionCommand {
  return { commandId: `CMD_${seq}`, playerId, type, payload: payload as ActionCommand['payload'] };
}

function mkEngine(seed = 7) {
  return new RuleEngine(basicConfig(2, seed));
}

/** 把 P1 前 N 张手牌替换为固定的「移动塔 2 格」牌，便于测试 */
function setFixedTowerHand(engine: RuleEngine, playerId: string, n: number): string[] {
  const player = engine.state.players[playerId]!;
  const tmplMap = (engine.state as unknown as { _cardTemplates: Record<string, string> })._cardTemplates;
  const ids: string[] = [];
  for (let i = 0; i < n; i++) {
    const id = `C_TEST_${playerId}_${i}`;
    player.hand[i] = id;
    tmplMap[id] = 'T_FIX_2';
    ids.push(id);
  }
  return ids;
}

describe('TC-TURN / TC-CARD 回合与行动', () => {
  it('TC-CARD-002: 非当前玩家不能打牌', () => {
    const engine = mkEngine();
    const card = engine.state.players['P1']!.hand[0]!;
    expect(() =>
      engine.execute(cmd('P2', 'PLAY_CARD', { cardId: card, wizardId: 'W_P2_01' })),
    ).toThrow(RuleError);
  });

  it('TC-CARD-001: 手牌不存在 -> CARD_NOT_IN_HAND', () => {
    const engine = mkEngine();
    expect(() =>
      engine.execute(cmd('P1', 'PLAY_CARD', { cardId: 'C_FAKE', wizardId: 'W_P1_01' })),
    ).toThrow(RuleError);
    try {
      engine.execute(cmd('P1', 'PLAY_CARD', { cardId: 'C_FAKE', wizardId: 'W_P1_01' }));
    } catch (e) {
      expect((e as RuleError).code).toBe(RuleErrorCode.CARD_NOT_IN_HAND);
    }
  });

  it('TC-TURN-001: 正常两次行动后进入 TURN_END 并补牌、轮转到 P2', () => {
    const engine = mkEngine();
    const [c1, c2] = setFixedTowerHand(engine, 'P1', 2);
    // 第一张：space 1 的 T01 前进 2 格到 space 3
    const r1 = engine.execute(
      cmd('P1', 'PLAY_CARD', { cardId: c1, chosenMode: 'TOWER', towerSourceSpaceIndex: 1, pickedTowerId: 'T01' }),
    );
    expect(engine.state.turnPhase).toBe(TurnPhase.ACTION_2);
    // 第二张：T01 现在在 space 3，再前进 2 格到 space 5
    const r2 = engine.execute(
      cmd('P1', 'PLAY_CARD', { cardId: c2, chosenMode: 'TOWER', towerSourceSpaceIndex: 3, pickedTowerId: 'T01' }),
    );
    expect(r2.endTurn).toBe(true);
    expect(engine.state.currentPlayerId).toBe('P2');
    expect(engine.state.turnPhase).toBe(TurnPhase.ACTION_1);
    expect(engine.state.players['P1']!.hand).toHaveLength(3);
    assertInvariants(engine.state);
  });

  it('TC-TURN-003: 弃 3 重抽模式', () => {
    const engine = mkEngine();
    const before = [...engine.state.players['P1']!.hand];
    const r = engine.execute(
      cmd('P1', 'DISCARD_REDRAW', { moveTowerAfterRedraw: false }),
    );
    expect(r.endTurn).toBe(true);
    const after = engine.state.players['P1']!.hand;
    expect(after).toHaveLength(3);
    expect(after).not.toEqual(before); // 牌变了
    for (const c of before) expect(engine.state.discardPile).toContain(c);
    expect(engine.state.currentPlayerId).toBe('P2');
  });

  it('TC-TURN-002: SKIP_SECOND_ACTION 弃掉第二张牌', () => {
    const engine = mkEngine();
    const [c1] = setFixedTowerHand(engine, 'P1', 1);
    engine.execute(
      cmd('P1', 'PLAY_CARD', { cardId: c1, chosenMode: 'TOWER', towerSourceSpaceIndex: 1, pickedTowerId: 'T01' }),
    );
    expect(engine.state.turnPhase).toBe(TurnPhase.ACTION_2);
    const c2 = engine.state.players['P1']!.hand[0]!;
    const r = engine.execute(cmd('P1', 'SKIP_SECOND_ACTION', { discardCardId: c2 }));
    expect(r.endTurn).toBe(true);
    expect(engine.state.discardPile).toContain(c2);
    expect(engine.state.currentPlayerId).toBe('P2');
  });

  it('巫师进堡后立即结束回合（不进入 ACTION_2）', () => {
    const engine = mkEngine();
    // 把城堡放到一个可被精确走到的位置，并给 P1 一张步数合适的牌
    // 简化：直接构造手牌为 W_FIX_2 并把巫师摆到城堡前 2 格
    placeCastleOnSpace(engine.state, 8);
    placeWizardOnGround(engine.state, 'W_P1_01', 6);
    clearSpace(engine.state, 7);
    // 替换 P1 第一张牌为一张 MOVE_WIZARD 固定 2 步牌
    const p1 = engine.state.players['P1']!;
    const newCardId = 'C_TEST_01';
    p1.hand[0] = newCardId;
    (engine.state as unknown as { _cardTemplates: Record<string, string> })._cardTemplates[newCardId] = 'W_FIX_2';
    const r = engine.execute(cmd('P1', 'PLAY_CARD', { cardId: newCardId, wizardId: 'W_P1_01' }));
    expect(r.endTurn).toBe(true);
    expect(engine.state.wizards['W_P1_01']!.state.mode).toBe(WizardStateType.IN_CASTLE);
    expect(engine.state.currentPlayerId).toBe('P2');
  });
});

describe('TC-POTION 药水系统', () => {
  it('TC-POTION-001: 封印成功后空瓶翻满（通过塔移动封印）', () => {
    const engine = mkEngine();
    // P1 在 space 3 单塔，space 5 有 P2 地面巫师
    setSingleTower(engine.state, 3, 'T01');
    clearSpace(engine.state, 5);
    placeWizardOnGround(engine.state, 'W_P2_01', 5);
    const beforeFull = countState(engine, 'P1', 'FULL');
    // 用一张塔牌移动 T01 前进 2 格到 space 5（封印 W_P2_01）
    const p1 = engine.state.players['P1']!;
    const card = p1.hand[0]!;
    (engine.state as unknown as { _cardTemplates: Record<string, string> })._cardTemplates[card] = 'T_FIX_2';
    engine.execute(
      cmd('P1', 'PLAY_CARD', { cardId: card, chosenMode: 'TOWER', towerSourceSpaceIndex: 3, pickedTowerId: 'T01' }),
    );
    const afterFull = countState(engine, 'P1', 'FULL');
    expect(afterFull).toBe(beforeFull + 1);
    expect(engine.state.wizards['W_P2_01']!.state.mode).toBe('IMPRISONED');
    assertInvariants(engine.state);
  });

  it('TC-POTION-005: 终局药水条件 = 没有空瓶', () => {
    const { state } = newGame(2);
    // P1: FULL=2, SPENT=4, EMPTY=0 (初始 6 瓶)
    setPotions(state, 'P1', ['FULL', 'FULL', 'SPENT', 'SPENT', 'SPENT', 'SPENT']);
    const empty = state.players['P1']!.potionIds.filter((p) => state.potions[p]!.state === 'EMPTY').length;
    expect(empty).toBe(0);
  });

  it('TC-POTION-007: 仍有空瓶 -> 不满足终局药水条件', () => {
    const { state } = newGame(2);
    setPotions(state, 'P1', ['FULL', 'FULL', 'FULL', 'FULL', 'FULL', 'EMPTY']);
    const empty = state.players['P1']!.potionIds.filter((p) => state.potions[p]!.state === 'EMPTY').length;
    expect(empty).toBe(1);
  });

  it('补牌：牌堆耗尽时洗弃牌堆回抽牌堆', () => {
    const { state } = buildInitialState(basicConfig(2, 99));
    // 把抽牌堆几乎抽空
    const player = state.players['P1']!;
    // 模拟大量弃牌
    state.discardPile = [...state.drawPile.splice(0, 80)];
    const handBefore = player.hand.length;
    void handBefore;
    const events: { type: string }[] = [];
    const emit = (type: string) => {
      events.push({ type });
      return { eventId: '', sequence: 0, type: type as never, payload: null } as never;
    };
    refillHand(state, 'P1', emit);
    expect(player.hand.length).toBe(3);
  });
});

function countState(engine: RuleEngine, playerId: string, st: 'EMPTY' | 'FULL' | 'SPENT'): number {
  const p = engine.state.players[playerId]!;
  return p.potionIds.filter((pid) => engine.state.potions[pid]!.state === st).length;
}

void placeWizardOnTower;
