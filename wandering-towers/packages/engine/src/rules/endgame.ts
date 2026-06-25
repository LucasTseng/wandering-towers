import type { GameEvent, GameState, PlayerID } from '@wt/shared';
import { WizardStateType } from '@wt/shared';
import { wizardsOfPlayer, countPotions } from '../state/selectors';

/**
 * 终局判定（V4 §14.10 / §11.2 / V2 §15 / TC-END-001~006）
 *
 * 终局触发条件（必须同时满足）：
 *   1. 该玩家所有巫师都已进入乌鸦城堡（IN_CASTLE）
 *   2. 该玩家已经没有空药水瓶（EMPTY == 0）
 *
 * 关键口径（V4 §11.2 红线）：终局药水条件是「没有空瓶」，
 * 不是「桌面当前全满」——已施法消耗为 SPENT 的瓶子也算「已完成填满」。
 */

/** 某玩家是否满足终局条件（不论是否已触发） */
export function satisfiesEndgame(state: GameState, playerId: PlayerID): boolean {
  const wizards = wizardsOfPlayer(state, playerId);
  if (wizards.length === 0) return false;
  const allInCastle = wizards.every((w) => w.state.mode === WizardStateType.IN_CASTLE);
  if (!allInCastle) return false;
  const emptyCount = countPotions(state, playerId, 'EMPTY');
  return emptyCount === 0;
}

/**
 * 检查并触发终局（V4 §14.10）。
 * 仅当该玩家满足条件且终局尚未触发时，emit ENDGAME_TRIGGERED 并返回 true。
 */
export function checkEndgameTrigger(
  state: GameState,
  playerId: PlayerID,
  emit: (type: GameEvent['type'], payload: unknown) => GameEvent,
): boolean {
  if (state.endgameTriggered) {
    return true; // 已触发，不重复
  }
  if (!satisfiesEndgame(state, playerId)) {
    return false;
  }
  emit('ENDGAME_TRIGGERED', { playerId, roundNumber: state.roundNumber });
  return true;
}

export interface FinalWinnersResult {
  winners: PlayerID[];
  shared: boolean;
  fullPotionCounts: Record<PlayerID, number>;
  scores: Record<PlayerID, number>;
}

/**
 * 最终胜负判定（V4 §14.11 / V2 §22.5）
 *
 * 在本轮结束后：
 *  1. 收集所有满足终局条件的玩家
 *  2. 仅 1 人 -> 该玩家获胜
 *  3. 多人 -> 比较剩余 FULL（未花掉满瓶）数量，多者胜
 *  4. FULL 相同 -> 并列胜利
 */
export function resolveFinalWinners(state: GameState): FinalWinnersResult {
  const fullPotionCounts: Record<PlayerID, number> = {};
  const scores: Record<PlayerID, number> = {};
  const satisfying: PlayerID[] = [];

  for (const playerId of Object.keys(state.players) as PlayerID[]) {
    const full = countPotions(state, playerId, 'FULL');
    fullPotionCounts[playerId] = full;
    scores[playerId] = full; // 分数 = 剩余 FULL 数（V4 §14.11）
    if (satisfiesEndgame(state, playerId)) {
      satisfying.push(playerId);
    }
  }

  let winners: PlayerID[];
  let shared: boolean;
  if (satisfying.length === 0) {
    winners = [];
    shared = false;
  } else if (satisfying.length === 1) {
    winners = satisfying;
    shared = false;
  } else {
    const maxFull = Math.max(...satisfying.map((p) => fullPotionCounts[p]!));
    winners = satisfying.filter((p) => fullPotionCounts[p] === maxFull);
    shared = winners.length > 1;
  }

  return { winners, shared, fullPotionCounts, scores };
}

/**
 * 引擎结算入口：计算胜者并 emit GAME_ENDED（V3 §20.8）。
 */
export function finalizeWinners(
  state: GameState,
  emit: (type: GameEvent['type'], payload: unknown) => GameEvent,
): FinalWinnersResult {
  const result = resolveFinalWinners(state);
  emit('GAME_ENDED', {
    winners: result.winners,
    scores: result.scores,
    shared: result.shared,
  });
  return result;
}

export type { GameEvent };
