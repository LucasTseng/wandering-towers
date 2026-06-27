// TC-REPLAY-001 / TC-REPLAY-002：回放一致性 + 随机对局不变量
//
// 本文件由根 `pnpm replay:check` 单独驱动（见 packages/engine/package.json 的
// replay:check 脚本），同时被默认 `pnpm test` 收集（vitest include 命中
// tests 目录下所有 .spec.ts）。
//
// - TC-REPLAY-001：实跑一局 → 用 initEvents + recordedEvents 经 replay() 重建 →
//   重建态必须与引擎实跑态在所有「游戏状态」字段上一致。
// - TC-REPLAY-002：跑 N 局随机对局，每条命令后断言五类不变量始终成立。
import { describe, it, expect } from 'vitest';
import { RuleEngine } from '../../src/rule-engine';
import { RuleError } from '../../src/rule-error';
import { replay } from '../../src/replay/replay';
import { assertInvariants } from '../../src/invariants';
import { basicConfig } from '../fixtures';
import {
  MovementCardType,
  TEMPLATE_BY_ID,
  TurnPhase,
  type ActionCommand,
  type GameEvent,
  type GameState,
  type PlayerID,
  type TowerID,
  type WizardID,
} from '@wt/shared';

/* ----------------------------- 测试用 PRNG ----------------------------- */

/** mulberry32 — 确定性 PRNG，用于自动化玩家的「随机」选择（保证可复现）。 */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* --------------------------- 引擎内省 helper --------------------------- */

interface CardTemplateMap {
  _cardTemplates?: Record<string, string>;
}

function cardTemplateType(state: GameState, cardId: string): MovementCardType {
  const tmplId = (state as unknown as CardTemplateMap)._cardTemplates?.[cardId];
  if (!tmplId) throw new Error(`no template for card ${cardId}`);
  const tmpl = TEMPLATE_BY_ID[tmplId];
  if (!tmpl) throw new Error(`unknown template ${tmplId}`);
  return tmpl.type;
}

/** 当前玩家的可见巫师（ON_GROUND / ON_TOWER_TOP）。 */
function ownVisibleWizards(state: GameState, playerId: PlayerID): WizardID[] {
  return Object.values(state.wizards)
    .filter(
      (w) =>
        w.ownerPlayerId === playerId &&
        (w.state.mode === 'ON_GROUND' || w.state.mode === 'ON_TOWER_TOP'),
    )
    .map((w) => w.id);
}

/** 棋盘上所有可选塔切片目标（每个空间里每一层塔都可作为 pickedTowerId）。 */
function towersOnBoard(state: GameState): { spaceIndex: number; towerId: TowerID }[] {
  const out: { spaceIndex: number; towerId: TowerID }[] = [];
  for (const sp of state.board.spaces) {
    for (const tid of sp.towerStack) {
      out.push({ spaceIndex: sp.index, towerId: tid });
    }
  }
  return out;
}

/* ------------------------- 自动化玩家候选生成 ------------------------- */

function buildCandidates(
  state: GameState,
  playerId: PlayerID,
  rnd: () => number,
): ActionCommand[] {
  const hand = state.players[playerId]!.hand;
  const wizards = ownVisibleWizards(state, playerId);
  const towers = towersOnBoard(state);
  const candidates: ActionCommand[] = [];

  for (const cardId of hand) {
    let type: MovementCardType;
    try {
      type = cardTemplateType(state, cardId);
    } catch {
      continue;
    }
    const isOr = type === MovementCardType.MOVE_WIZARD_OR_TOWER;

    // 巫师模式候选
    if (type === MovementCardType.MOVE_WIZARD || isOr) {
      for (const wizardId of wizards) {
        candidates.push({
          commandId: `CMD_AUTO_${playerId}`,
          playerId,
          type: 'PLAY_CARD',
          payload: {
            cardId,
            ...(isOr ? { chosenMode: 'WIZARD' as const } : {}),
            wizardId,
          },
        });
      }
    }
    // 塔模式候选
    if (type === MovementCardType.MOVE_TOWER || isOr) {
      for (const t of towers) {
        candidates.push({
          commandId: `CMD_AUTO_${playerId}`,
          playerId,
          type: 'PLAY_CARD',
          payload: {
            cardId,
            ...(isOr ? { chosenMode: 'TOWER' as const } : {}),
            towerSourceSpaceIndex: t.spaceIndex,
            pickedTowerId: t.towerId,
          },
        });
      }
    }
  }

  // 打乱顺序，使对局路径多样化
  for (let i = candidates.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [candidates[i], candidates[j]] = [candidates[j]!, candidates[i]!];
  }
  return candidates;
}

function makeCmd(playerId: PlayerID, type: ActionCommand['type'], payload: ActionCommand['payload']): ActionCommand {
  return { commandId: `CMD_AUTO_${playerId}`, playerId, type, payload };
}

/* ----------------------------- 驱动一局 ----------------------------- */

export interface PlayedGame {
  engine: RuleEngine;
  events: GameEvent[]; // initEvents + recordedEvents
  commandsExecuted: number;
  finished: boolean;
}

/**
 * 用确定性 PRNG 驱动一局随机对局，每条命令后断言不变量。
 *
 * 进度保证：每个 ACTION 阶段先尝试 PLAY_CARD 候选；全部非法时
 *   - ACTION_1 回退 DISCARD_REDRAW（必合法，直接结束回合）
 *   - ACTION_2 回退 SKIP_SECOND_ACTION（必合法）
 * 故每轮至少推进一个回合，配合 maxCommands 上限必终止。
 */
export function playRandomGame(
  seed: number,
  playerCount = 2,
  maxCommands = 800,
): PlayedGame {
  // 传 { seed } 以匹配 useGame 真实用法（否则 state-builder 会生成随机种子
  // 并写回 state.config.seed，导致回放种子不一致）
  const engine = new RuleEngine(basicConfig(playerCount, seed), { seed });
  const rnd = mulberry32(seed * 2654435761 + 1);
  const recordedEvents: GameEvent[] = [];
  let commandsExecuted = 0;

  while (
    engine.state.turnPhase !== TurnPhase.GAME_FINISHED &&
    commandsExecuted < maxCommands
  ) {
    const player = engine.state.currentPlayerId;
    const phase = engine.state.turnPhase;
    const hand = engine.state.players[player]!.hand;

    let executed = false;

    if (phase === TurnPhase.ACTION_1 || phase === TurnPhase.ACTION_2) {
      const candidates = buildCandidates(engine.state, player, rnd);
      // 最多尝试 12 个候选，避免极端情况下遍历全部
      for (const cmd of candidates.slice(0, 12)) {
        try {
          const r = engine.execute(cmd);
          recordedEvents.push(...r.events);
          executed = true;
          break;
        } catch (e) {
          if (e instanceof RuleError) continue; // 非法目标，换下一个
          throw e;
        }
      }
      if (!executed) {
        // 回退路径
        try {
          if (phase === TurnPhase.ACTION_1 && hand.length > 0) {
            const r = engine.execute(
              makeCmd(player, 'DISCARD_REDRAW', { moveTowerAfterRedraw: false }),
            );
            recordedEvents.push(...r.events);
            executed = true;
          } else if (phase === TurnPhase.ACTION_2 && hand.length > 0) {
            const r = engine.execute(
              makeCmd(player, 'SKIP_SECOND_ACTION', { discardCardId: hand[0]! }),
            );
            recordedEvents.push(...r.events);
            executed = true;
          }
        } catch (e) {
          if (!(e instanceof RuleError)) throw e;
        }
      }
    }

    if (!executed) {
      // 终极保底：显式结束回合
      try {
        const r = engine.execute(makeCmd(player, 'END_TURN', {}));
        recordedEvents.push(...r.events);
      } catch (e) {
        if (!(e instanceof RuleError)) throw e;
        break; // 无法推进，退出避免死循环
      }
    }

    commandsExecuted += 1;
    assertInvariants(engine.state); // TC-REPLAY-002：每条命令后不变量必须成立
  }

  return {
    engine,
    events: [...engine.getInitEvents(), ...recordedEvents],
    commandsExecuted,
    finished: engine.state.turnPhase === TurnPhase.GAME_FINISHED,
  };
}

/* ------------------------------ 归一化比较 ------------------------------ */

/**
 * stateVersion 是「按命令自增」的并发控制元数据（V3 §5.2），由 RuleEngine.execute
 * 维护，不在事件流中——纯事件回放无法复现该计数。它是联机防冲突用，不属于
 * 事件溯源的游戏状态。故比较前将双方 stateVersion 归零，只校验游戏状态一致性。
 */
function normalizeVersion(s: GameState): GameState {
  return { ...s, stateVersion: 0 };
}

/* -------------------------------- 测试 -------------------------------- */

describe('TC-REPLAY-001 回放一致性', () => {
  it('实跑若干命令后，replay(initEvents+recordedEvents) 重建态与引擎态一致', () => {
    const seed = 42;
    const { engine, events } = playRandomGame(seed, 2);
    expect(events.length).toBeGreaterThan(0);

    // 用与 useGame.exportSave 一致的 (config, seed) 回放
    const replayed = replay({ config: basicConfig(2, seed), seed, events });

    expect(normalizeVersion(replayed)).toEqual(normalizeVersion(engine.state));
  });

  it('多 seed / 多人数下回放均一致', () => {
    for (const seed of [1, 7, 100, 2024]) {
      for (const players of [2, 3]) {
        const { engine, events } = playRandomGame(seed, players);
        const replayed = replay({ config: basicConfig(players, seed), seed, events });
        expect(normalizeVersion(replayed)).toEqual(normalizeVersion(engine.state));
      }
    }
  });
});

describe('TC-REPLAY-002 随机对局不变量', () => {
  // DoD（T1.9 / invariants 注释）：100 局随机对局无非法状态。
  // 可用 WT_RANDOM_GAMES 环境变量覆盖（如本地快速跑少量）。
  const N = Number(process.env.WT_RANDOM_GAMES ?? 100);

  it(`${N} 局随机对局全程无不变量违例`, () => {
    let finished = 0;
    let totalCommands = 0;
    for (let i = 0; i < N; i++) {
      const game = playRandomGame(1000 + i, 2 + (i % 3)); // 2-4 人
      totalCommands += game.commandsExecuted;
      if (game.finished) finished += 1;
      // playRandomGame 内部每条命令后已断言；这里再收尾断言一次终态
      assertInvariants(game.engine.state);
    }
    // 诊断信息：完成率与平均命令数（不作为硬性失败条件——不变量才是 DoD）
    // eslint-disable-next-line no-console
    console.log(
      `[TC-REPLAY-002] ${N} 局：${finished} 局自然终局，平均 ${Math.round(totalCommands / N)} 条命令/局`,
    );
    expect(finished).toBeGreaterThanOrEqual(0);
  });
});
