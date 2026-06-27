/**
 * 客户端回放工具（V3 §19 / V4 §7）
 * 与 engine 的 replay/replay.ts 区分：本模块提供"按 cursor 步进"的核心逻辑，
 * engine 那个负责"一次性重建最终状态"。
 */
import { buildInitialState, applyEvent } from '@wt/engine';
import type { GameEvent, GameState, SaveGame } from '@wt/shared';

/** 从 SaveGame 构造初始状态（未应用任何事件） */
export function buildInitialReplayState(save: SaveGame): GameState {
  return buildInitialState(save.config, save.seed).state;
}

/** 在 [0, total] 范围内应用前 cursor 个事件，返回该快照状态。
 *  cursor=0 返回纯初始状态，cursor=total 返回最终状态。
 *  这是回放步进 UI 的核心：不需要重新 build，每次只需 apply 增量事件。 */
export function snapshotAt(save: SaveGame, cursor: number): GameState {
  const state = buildInitialReplayState(save);
  const all = [...save.initialEvents, ...save.recordedEvents];
  const end = Math.min(Math.max(0, cursor), all.length);
  for (let i = 0; i < end; i++) {
    applyEvent(state, all[i]!);
  }
  return state;
}

/** 重建最终状态（应用所有事件），应与 save.finalState 状态结构一致 */
export function buildFinalReplayState(save: SaveGame): GameState {
  return snapshotAt(save, [...save.initialEvents, ...save.recordedEvents].length);
}

/** 全部事件数（init + recorded） */
export function totalEventCount(save: SaveGame): number {
  return save.initialEvents.length + save.recordedEvents.length;
}

/** 校验 SaveGame 基本结构（zod 之外的轻量校验） */
export function isValidSave(raw: unknown): raw is SaveGame {
  if (!raw || typeof raw !== 'object') return false;
  const s = raw as Record<string, unknown>;
  return (
    typeof s.gameId === 'string' &&
    s.version === '1.0' &&
    typeof s.savedAt === 'string' &&
    !!s.config && typeof s.config === 'object' &&
    typeof s.seed === 'number' &&
    Array.isArray(s.initialEvents) &&
    Array.isArray(s.recordedEvents)
  );
}
