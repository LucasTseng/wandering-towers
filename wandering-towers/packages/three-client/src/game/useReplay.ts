import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { SaveGame } from '@wt/shared';
import { snapshotAt, totalEventCount } from './replay';

/**
 * 回放状态机（只读）。
 *
 * `cursor` 语义与 `@wt/client` 的 ReplayView 完全一致：已应用的事件条数，
 * 0 = 开局，total = 终局。快照由 `snapshotAt` 从初始状态重放得到，
 * 因此回放不依赖当前对局状态，也不会污染 `useGame`。
 */
export function useReplay() {
  const [save, setSave] = useState<SaveGame | null>(null);
  const [cursor, setCursor] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(450);
  const timerRef = useRef<number | null>(null);

  const total = useMemo(() => (save ? totalEventCount(save) : 0), [save]);
  const events = useMemo(
    () => (save ? [...save.initialEvents, ...save.recordedEvents] : []),
    [save],
  );
  const snapshot = useMemo(() => (save ? snapshotAt(save, cursor) : null), [save, cursor]);

  const seek = useCallback(
    (next: number) => {
      const limit = Math.max(total, 0);
      const clamped = Math.min(Math.max(0, Math.round(next)), limit);
      setCursor(clamped);
      if (clamped >= limit) setPlaying(false);
    },
    [total],
  );

  const toggle = useCallback(() => {
    if (!playing && cursor >= total) {
      // 已到终局时再点播放 = 从头重播
      setCursor(0);
      setPlaying(true);
      return;
    }
    setPlaying(!playing);
  }, [playing, cursor, total]);

  const open = useCallback((next: SaveGame) => {
    setSave(next);
    setCursor(0);
    setPlaying(false);
  }, []);

  const close = useCallback(() => {
    setSave(null);
    setPlaying(false);
    setCursor(0);
  }, []);

  // 自动播放：每步一个 setTimeout，结束时停在终局
  useEffect(() => {
    if (!playing || !save) return;
    if (cursor >= total) {
      setPlaying(false);
      return;
    }
    timerRef.current = window.setTimeout(() => {
      setCursor((prev) => Math.min(prev + 1, total));
    }, speed);
    return () => {
      if (timerRef.current !== null) {
        window.clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [playing, cursor, speed, total, save]);

  return {
    save,
    snapshot,
    events,
    total,
    cursor,
    playing,
    speed,
    open,
    close,
    seek,
    toggle,
    setSpeed,
  };
}

export type ReplayController = ReturnType<typeof useReplay>;
