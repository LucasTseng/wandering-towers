import { useEffect, useRef } from 'react';
import type { GameEvent, GameState } from '@wt/shared';
import { PotionState as PS } from '@wt/shared';
import { EVENT_ZH } from './Overlays';
import { playerColor, playerName } from '../scene/pieces';

const SPEEDS = [1000, 450, 180, 45];

interface ReplayPanelProps {
  state: GameState;
  events: GameEvent[];
  cursor: number;
  total: number;
  playing: boolean;
  speed: number;
  onSeek: (next: number) => void;
  onTogglePlay: () => void;
  onSpeed: (ms: number) => void;
  onExit: () => void;
}

/**
 * 回放侧栏：只读展示。
 *
 * 与 `@wt/client` 的 ReplayView 同口径（cursor = 已应用事件数），
 * 但把控件、当前事件、玩家进度都收进一块羊皮纸面板，避免遮挡 3D 舞台。
 */
export function ReplayPanel(props: ReplayPanelProps) {
  const { state, events, cursor, total, playing, speed, onSeek, onTogglePlay, onSpeed, onExit } = props;
  const listRef = useRef<HTMLDivElement>(null);

  const current = cursor > 0 ? events[cursor - 1] : null;
  const windowStart = Math.max(0, cursor - 7);
  const windowEnd = Math.min(events.length, cursor + 7);
  const visible = events.slice(windowStart, windowEnd);
  const order = state.playerOrder.length > 0 ? state.playerOrder : Object.keys(state.players);

  // 事件流跟随游标
  useEffect(() => {
    const node = listRef.current?.querySelector('.is-current');
    node?.scrollIntoView({ block: 'nearest' });
  }, [cursor]);

  // 键盘：空格播放/暂停，左右步进，Esc 退出
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onExit();
        return;
      }
      if (event.key === ' ' || event.key === 'Spacebar') {
        event.preventDefault();
        onTogglePlay();
        return;
      }
      if (event.key === 'ArrowRight') {
        event.preventDefault();
        onSeek(Math.min(total, cursor + 1));
        return;
      }
      if (event.key === 'ArrowLeft') {
        event.preventDefault();
        onSeek(Math.max(0, cursor - 1));
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [cursor, total, onExit, onSeek, onTogglePlay]);

  return (
    <section className="va-panel panel-replay">
      <div className="panel-head">
        <svg className="panel-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.35">
          <circle cx="12" cy="12" r="9" />
          <path d="M12 7.5V12l3.4 2" />
        </svg>
        <span className="panel-title">对局回放</span>
        <span className="panel-meta">
          <strong>{cursor}</strong> / {total} 步
        </span>
      </div>

      <div className="replay-scrub">
        <input
          type="range"
          min={0}
          max={Math.max(total, 1)}
          value={cursor}
          aria-label="回放进度"
          onChange={(event) => onSeek(Number(event.target.value))}
        />
        <div className="replay-scrub-ends">
          <span>开局</span>
          <span>终局</span>
        </div>
      </div>

      <div className="replay-controls">
        <button type="button" onClick={() => onSeek(0)} disabled={cursor === 0}>
          开局
        </button>
        <button type="button" onClick={() => onSeek(Math.max(0, cursor - 1))} disabled={cursor === 0}>
          上一步
        </button>
        <button
          type="button"
          className="replay-play"
          onClick={onTogglePlay}
          disabled={total === 0 || (!playing && cursor >= total)}
        >
          {playing ? '暂停' : '播放'}
        </button>
        <button
          type="button"
          onClick={() => onSeek(Math.min(total, cursor + 1))}
          disabled={cursor >= total}
        >
          下一步
        </button>
        <button type="button" onClick={() => onSeek(total)} disabled={cursor >= total}>
          终局
        </button>
      </div>

      <div className="replay-speeds">
        <span>速度</span>
        {SPEEDS.map((ms) => (
          <button
            key={ms}
            type="button"
            className={`replay-speed${speed === ms ? ' is-active' : ''}`}
            onClick={() => onSpeed(ms)}
          >
            {ms >= 1000 ? `${ms / 1000}s` : ms >= 180 ? `${ms / 1000}s` : `${ms}ms`}
          </button>
        ))}
      </div>

      <div className="replay-now">
        {current ? (
          <>
            <span className="replay-now-kicker">当前事件</span>
            <div className="replay-now-body">
              <span className="replay-seq">#{cursor}</span>
              <span className="replay-type">{EVENT_ZH[current.type] ?? current.type}</span>
              {current.actorPlayerId && (
                <span className="replay-actor">
                  <i style={{ background: playerColor(current.actorPlayerId) }} />
                  {current.actorPlayerId}
                </span>
              )}
            </div>
          </>
        ) : (
          <>
            <span className="replay-now-kicker">当前位置</span>
            <div className="replay-now-body">
              <span className="replay-type">尚未开始</span>
            </div>
          </>
        )}
      </div>

      <div className="replay-stream" ref={listRef}>
        {visible.map((event, index) => {
          const absolute = windowStart + index;
          const isCurrent = absolute === cursor - 1;
          const isPast = absolute < cursor - 1;
          return (
            <button
              type="button"
              key={event.eventId}
              className={`replay-event${isCurrent ? ' is-current' : ''}${isPast ? ' is-past' : ''}`}
              onClick={() => onSeek(absolute + 1)}
              title="跳到这一步"
            >
              <span className="replay-seq">#{absolute + 1}</span>
              <span className="replay-type">{EVENT_ZH[event.type] ?? event.type}</span>
              {event.actorPlayerId && (
                <i className="replay-actor-dot" style={{ background: playerColor(event.actorPlayerId) }} />
              )}
            </button>
          );
        })}
        {visible.length === 0 && <div className="replay-empty">还没有记录到事件</div>}
      </div>

      <div className="replay-scores">
        {order.map((pid) => {
          const player = state.players[pid];
          const wizards = player ? player.wizardIds.map((id) => state.wizards[id]).filter(Boolean) : [];
          const inCastle = wizards.filter((w) => w?.state.mode === 'IN_CASTLE').length;
          const potions = player ? player.potionIds.map((id) => state.potions[id]?.state) : [];
          const full = potions.filter((s) => s === PS.FULL).length;
          return (
            <div className={`replay-score${pid === state.currentPlayerId ? ' is-active' : ''}`} key={pid}>
              <i className="replay-score-dot" style={{ background: playerColor(pid) }} />
              <span className="replay-score-name">{playerName(pid)}</span>
              <span className="replay-score-value">
                进堡 {inCastle}/{wizards.length || '—'} · 满瓶 {full}
              </span>
            </div>
          );
        })}
      </div>

      <button className="replay-exit" type="button" onClick={onExit}>
        退出回放 · 返回对局
      </button>
    </section>
  );
}
