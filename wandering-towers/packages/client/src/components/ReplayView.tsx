import { useEffect, useMemo, useRef, useState } from 'react';
import type { SaveGame } from '@wt/shared';
import { snapshotAt, totalEventCount, isValidSave } from '../game/replay';
import { Board } from './Board';
import { PlayerInfo } from './PlayerInfo';
import { LogPanel } from './LogPanel';
import { deriveAllSpaces } from '../game/selectors';

interface ReplayViewProps {
  save: SaveGame;
  onExit: () => void;
}

/** 回放视图：步进控件 + 快照渲染（只读，不可操作） */
export function ReplayView({ save, onExit }: ReplayViewProps) {
  const total = useMemo(() => totalEventCount(save), [save]);
  const [cursor, setCursor] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(500); // ms per step
  const timerRef = useRef<number | null>(null);

  // 自动播放
  useEffect(() => {
    if (!playing) {
      if (timerRef.current !== null) {
        window.clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      return;
    }
    if (cursor >= total) {
      setPlaying(false);
      return;
    }
    timerRef.current = window.setTimeout(() => {
      setCursor((c) => Math.min(c + 1, total));
    }, speed);
    return () => {
      if (timerRef.current !== null) {
        window.clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [playing, cursor, speed, total]);

  const snapshot = useMemo(() => snapshotAt(save, cursor), [save, cursor]);
  const cells = useMemo(() => deriveAllSpaces(snapshot), [snapshot]);

  // 当前光标处产生的事件
  const all = useMemo(
    () => [...save.initialEvents, ...save.recordedEvents],
    [save],
  );
  const currentEvent = cursor > 0 ? all[cursor - 1] ?? null : null;
  const eventsUpToCursor = all.slice(0, cursor);

  return (
    <div style={{ fontFamily: 'sans-serif', padding: 12, maxWidth: 1200, margin: '0 auto' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1 style={{ margin: 0 }}>📼 回放 / {save.gameId}</h1>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <span style={{ fontSize: 13, color: '#666' }}>{save.savedAt}</span>
          <button onClick={onExit} style={{ cursor: 'pointer' }}>退出回放</button>
        </div>
      </header>

      {/* 步进控件 */}
      <div
        style={{
          display: 'flex',
          gap: 8,
          alignItems: 'center',
          padding: 8,
          background: '#e3f2fd',
          borderRadius: 6,
          margin: '8px 0',
        }}
      >
        <button onClick={() => setCursor(0)} disabled={cursor === 0}>⏮ 开头</button>
        <button onClick={() => setCursor((c) => Math.max(0, c - 1))} disabled={cursor === 0}>
          ◀ 上一步
        </button>
        <button
          onClick={() => setPlaying((p) => !p)}
          disabled={cursor >= total}
          style={{ minWidth: 80 }}
        >
          {playing ? '⏸ 暂停' : '▶ 播放'}
        </button>
        <button
          onClick={() => setCursor((c) => Math.min(total, c + 1))}
          disabled={cursor >= total}
        >
          下一步 ▶
        </button>
        <button onClick={() => setCursor(total)} disabled={cursor === total}>⏭ 结尾</button>
        <span style={{ marginLeft: 16, fontSize: 13 }}>
          步进 {cursor} / {total}
        </span>
        <label style={{ marginLeft: 'auto', fontSize: 12 }}>
          速度：
          <select
            value={speed}
            onChange={(e) => setSpeed(Number(e.target.value))}
            style={{ marginLeft: 4 }}
          >
            <option value={1000}>慢 (1s)</option>
            <option value={500}>中 (0.5s)</option>
            <option value={200}>快 (0.2s)</option>
            <option value={50}>极快 (50ms)</option>
          </select>
        </label>
      </div>

      {/* 当前事件高亮 */}
      {currentEvent && (
        <div
          style={{
            background: '#fff3e0',
            padding: '6px 12px',
            borderRadius: 6,
            margin: '4px 0',
            fontSize: 13,
          }}
        >
          <strong>当前事件</strong> #{currentEvent.sequence} {currentEvent.type}
          {currentEvent.actorPlayerId && ` (${currentEvent.actorPlayerId})`}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '220px 1fr', gap: 12 }}>
        <aside>
          {snapshot.playerOrder.map((pid) => (
            <PlayerInfo
              key={pid}
              state={snapshot}
              playerId={pid}
              isCurrent={pid === snapshot.currentPlayerId}
            />
          ))}
        </aside>
        <main>
          <Board cells={cells} />
          <div style={{ marginTop: 8 }}>
            <LogPanel events={eventsUpToCursor} />
          </div>
        </main>
      </div>
    </div>
  );
}

/** 回放模式容器：管理 SaveGame 加载/导出/进入回放 */
export function ReplayLauncher({ save, onExit }: { save: SaveGame | null; onExit: () => void }) {
  const [loaded, setLoaded] = useState<SaveGame | null>(save);
  const [error, setError] = useState<string | null>(null);

  if (loaded) {
    if (!isValidSave(loaded)) {
      return (
        <div style={{ padding: 24 }}>
          <p>存档格式无效</p>
          <button onClick={onExit}>返回</button>
        </div>
      );
    }
    return <ReplayView save={loaded} onExit={onExit} />;
  }

  // 加载界面：支持文件选择
  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const raw = JSON.parse(text);
      if (!isValidSave(raw)) {
        setError('存档格式无效（不是合法的 SaveGame v1.0）');
        return;
      }
      setLoaded(raw);
      setError(null);
    } catch (e) {
      setError(`解析失败: ${(e as Error).message}`);
    }
  };

  return (
    <div style={{ padding: 24, maxWidth: 600, margin: '0 auto' }}>
      <h1>📼 加载回放</h1>
      <p>选择 .json 存档文件：</p>
      <input type="file" accept="application/json,.json" onChange={handleFile} />
      {error && <p style={{ color: '#c0392b' }}>{error}</p>}
      <p style={{ marginTop: 16 }}>
        <button onClick={onExit}>取消</button>
      </p>
    </div>
  );
}
