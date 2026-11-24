import { describe, it, expect } from 'vitest';
import type { ActionCommand, GameState, PlayerID, WizardID } from '@wt/shared';
import { RuleErrorCode, WizardStateType, PotionState } from '@wt/shared';
import { RuleError } from '../src/rule-error';
import { createEngine, type RuleEngine } from '../src/rule-engine';
import { basicConfig } from './fixtures';

/**
 * 终局集成测试：走真实 RuleEngine.execute 命令链路。
 *
 * 既有的 castle-endgame.spec.ts 只直接调用 checkEndgameTrigger（且用
 * mkApplyEmit 同步应用事件），掩盖了「规则函数 emit 事件、applyEvents 在
 * 命令末尾才执行」的时序问题。这里专门覆盖该路径。
 */

function putWizardsInCastle(state: GameState, playerId: PlayerID, except: WizardID[] = []): void {
  for (const wid of state.players[playerId]!.wizardIds) {
    if (except.includes(wid)) continue;
    const w = state.wizards[wid]!;
    if (w.state.mode === WizardStateType.ON_GROUND) {
      const sp = state.board.spaces[w.state.spaceIndex]!;
      sp.groundVisibleWizards = sp.groundVisibleWizards.filter((id) => id !== wid);
    }
    w.state = { mode: WizardStateType.IN_CASTLE };
    if (!state.ravenCastle.wizardIdsInside.includes(wid)) {
      state.ravenCastle.wizardIdsInside.push(wid);
    }
  }
}

function setAllPotions(state: GameState, playerId: PlayerID, value: PotionState): void {
  for (const pid of state.players[playerId]!.potionIds) {
    state.potions[pid]!.state = value;
  }
}

function putWizardOnGround(state: GameState, wizardId: WizardID, spaceIndex: number): void {
  const w = state.wizards[wizardId]!;
  if (w.state.mode === WizardStateType.ON_GROUND) {
    const old = state.board.spaces[w.state.spaceIndex]!;
    old.groundVisibleWizards = old.groundVisibleWizards.filter((id) => id !== wizardId);
  }
  w.state = { mode: WizardStateType.ON_GROUND, spaceIndex };
  state.board.spaces[spaceIndex]!.groundVisibleWizards.push(wizardId);
}

function cmd(playerId: PlayerID, type: ActionCommand['type'], payload: unknown): ActionCommand {
  return { commandId: '', playerId, type, payload } as ActionCommand;
}

/** 构造「P1 只剩 1 名巫师在城堡前一格、持有 1 步巫师牌」的局面 */
function lastWizardSetup() {
  const { engine, state } = createEngine(basicConfig(2, 42));
  const wids = state.players.P1!.wizardIds;
  const lastWizard = wids[wids.length - 1]!;
  putWizardsInCastle(state, 'P1', [lastWizard]);
  const castleSpace = state.ravenCastle.position.spaceIndex;
  putWizardOnGround(state, lastWizard, (castleSpace - 1 + 16) % 16);

  const cardId = 'C_LAST_WIZARD_TEST';
  state.players.P1!.hand = [cardId];
  const templateMap = (state as unknown as { _cardTemplates: Record<string, string> })._cardTemplates;
  templateMap[cardId] = 'W_FIX_1';
  state.currentPlayerId = 'P1';
  state.turnPhase = 'ACTION_1';
  return { engine, state, lastWizard, cardId, wids, castleSpace };
}

function playWizardOneStep(engine: RuleEngine, cardId: string, wizardId: WizardID) {
  return engine.execute(cmd('P1', 'PLAY_CARD', { cardId, wizardId, resolvedMoveValue: 1 }));
}

describe('终局：真实命令链路', () => {
  it('最后一名巫师进堡 + 无空瓶 -> 触发 ENDGAME_TRIGGERED', () => {
    const { engine, state } = createEngine(basicConfig(2, 42));
    setAllPotions(state, 'P1', PotionState.FULL);

    const wids = state.players.P1!.wizardIds;
    const lastWizard = wids[wids.length - 1]!;
    putWizardsInCastle(state, 'P1', [lastWizard]);

    const castleSpace = state.ravenCastle.position.spaceIndex;
    putWizardOnGround(state, lastWizard, (castleSpace - 1 + 16) % 16);

    const cardId = 'C_ENDGAME_TEST';
    state.players.P1!.hand = [cardId];
    const templateMap = (state as unknown as { _cardTemplates: Record<string, string> })._cardTemplates;
    templateMap[cardId] = 'W_FIX_1';
    state.currentPlayerId = 'P1';
    state.turnPhase = 'ACTION_1';

    const result = engine.execute(
      cmd('P1', 'PLAY_CARD', { cardId, wizardId: lastWizard, resolvedMoveValue: 1 }),
    );

    expect(result.events.some((e) => e.type === 'ENDGAME_TRIGGERED')).toBe(true);
    expect(state.endgameTriggered).toBe(true);
    expect(state.endgameTriggerPlayerId).toBe('P1');
  });

  it('条件在非进堡动作后达成（END_TURN）-> 也应触发终局', () => {
    const { engine, state } = createEngine(basicConfig(2, 42));
    putWizardsInCastle(state, 'P1');
    setAllPotions(state, 'P1', PotionState.FULL);
    state.currentPlayerId = 'P1';
    state.turnPhase = 'ACTION_DONE';

    engine.execute(cmd('P1', 'END_TURN', {}));
    expect(state.endgameTriggered).toBe(true);
  });

  it('全进堡但仍有空瓶 -> 不触发', () => {
    const { engine, state } = createEngine(basicConfig(2, 42));
    putWizardsInCastle(state, 'P1');
    state.currentPlayerId = 'P1';
    state.turnPhase = 'ACTION_DONE';

    engine.execute(cmd('P1', 'END_TURN', {}));
    expect(state.endgameTriggered).toBe(false);
  });

  it('同轮两人达成 -> 打完整轮后按剩余 FULL 多者胜', () => {
    const { engine, state } = createEngine(basicConfig(2, 42));
    putWizardsInCastle(state, 'P1');
    putWizardsInCastle(state, 'P2');
    setAllPotions(state, 'P1', PotionState.FULL);
    setAllPotions(state, 'P2', PotionState.FULL);
    // P2 多留 2 个未花掉的满瓶：把 P1 的 2 个改成 SPENT（仍非 EMPTY，不破坏终局条件）
    const p1PotionIds = state.players.P1!.potionIds;
    state.potions[p1PotionIds[0]!]!.state = PotionState.SPENT;
    state.potions[p1PotionIds[1]!]!.state = PotionState.SPENT;

    state.currentPlayerId = 'P1';
    state.turnPhase = 'ACTION_DONE';
    engine.execute(cmd('P1', 'END_TURN', {}));
    expect(state.endgameTriggered).toBe(true);
    // 终局已触发但仍需打完当前轮，P2 回合不应被跳过
    expect(state.currentPlayerId).toBe('P2');
    expect(state.turnPhase).not.toBe('GAME_FINISHED');

    engine.execute(cmd('P2', 'END_TURN', {}));
    expect(state.turnPhase).toBe('GAME_FINISHED');
    expect(state.winners).toEqual(['P2']);
    expect(state.sharedVictory).toBe(false);
  });
});

describe('最后一名巫师进堡前置校验（防卡死）', () => {
  it('只剩最后 1 名巫师且仍有空瓶 -> 拒绝进堡并给出可读提示', () => {
    const { engine, state, lastWizard, cardId } = lastWizardSetup();
    // 初始药水全为 EMPTY
    expect(countEmpty(state, 'P1')).toBeGreaterThan(0);

    let caught: unknown;
    try {
      playWizardOneStep(engine, cardId, lastWizard);
    } catch (e) {
      caught = e;
    }
    expect(caught).toBeInstanceOf(RuleError);
    expect((caught as RuleError).code).toBe(RuleErrorCode.LAST_WIZARD_NEEDS_NO_EMPTY_POTION);
    expect((caught as RuleError).message).toContain('空药水瓶');
    expect(state.wizards[lastWizard]!.state.mode).not.toBe(WizardStateType.IN_CASTLE);
    expect(state.endgameTriggered).toBe(false);
  });

  it('只剩最后 1 名巫师但已无空瓶 -> 允许进堡并触发终局', () => {
    const { engine, state, lastWizard, cardId } = lastWizardSetup();
    setAllPotions(state, 'P1', PotionState.FULL);

    const result = playWizardOneStep(engine, cardId, lastWizard);
    expect(state.wizards[lastWizard]!.state.mode).toBe(WizardStateType.IN_CASTLE);
    expect(result.events.some((e) => e.type === 'ENDGAME_TRIGGERED')).toBe(true);
    expect(state.endgameTriggered).toBe(true);
  });

  it('还有其他巫师在场时，即使有空瓶也允许进堡', () => {
    const { engine, state, lastWizard, cardId, wids, castleSpace } = lastWizardSetup();
    const other = wids[wids.length - 2]!;
    // 把倒数第二名巫师从城堡里放回场上（lastWizardSetup 已把它放进堡）
    state.ravenCastle.wizardIdsInside = state.ravenCastle.wizardIdsInside.filter((id) => id !== other);
    putWizardOnGround(state, other, (castleSpace + 5) % 16);

    const result = playWizardOneStep(engine, cardId, lastWizard);
    expect(state.wizards[lastWizard]!.state.mode).toBe(WizardStateType.IN_CASTLE);
    expect(result.events.some((e) => e.type === 'WIZARD_ENTERED_CASTLE')).toBe(true);
    expect(state.endgameTriggered).toBe(false);
  });
});

function countEmpty(state: GameState, playerId: PlayerID): number {
  return state.players[playerId]!.potionIds.filter(
    (pid) => state.potions[pid]!.state === PotionState.EMPTY,
  ).length;
}
