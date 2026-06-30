import { useState } from 'react';
import type { GameState, PlayerID } from '@wt/shared';
import { WizardStateType } from '@wt/shared';
import { countPotions, wizardsOfPlayer } from '@wt/engine';
import { PLAYER_COLORS } from '../game/config';

interface PlayerBarProps {
  state: GameState;
  currentId: PlayerID;
}

const MAX_SLOTS = 6;

/** 玩家信息区（§10.3 第 1 区）：顶部横向条，6 等宽槽位占满宽度。
 * - 当前玩家：展开为大完整面板（高亮其色）。
 * - 其他玩家：小图标 + 主要信息；hover 弹公开计数浮层。 */
export function PlayerBar({ state, currentId }: PlayerBarProps) {
  const slots: (PlayerID | null)[] = [...state.playerOrder];
  while (slots.length < MAX_SLOTS) slots.push(null);

  const current = state.players[currentId];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <div style={{ display: 'grid', gridTemplateColumns: `repeat(${MAX_SLOTS}, 1fr)`, gap: 2 }}>
        {slots.map((pid, i) => (
          <PlayerSlot key={pid ?? `empty-${i}`} state={state} playerId={pid} isCurrent={pid === currentId} />
        ))}
      </div>
      {current && <CurrentPlayerPanel state={state} playerId={currentId} />}
    </div>
  );
}

function PlayerSlot({ state, playerId, isCurrent }: { state: GameState; playerId: PlayerID | null; isCurrent: boolean }) {
  const [hover, setHover] = useState(false);
  if (!playerId) {
    return <div style={{ height: 44, border: '1px dashed #444', borderRadius: 4, opacity: 0.4 }} />;
  }
  const color = PLAYER_COLORS[playerId] ?? '#888';
  const wizards = wizardsOfPlayer(state, playerId);
  const inCastle = wizards.filter((w) => w.state.mode === WizardStateType.IN_CASTLE).length;
  const full = countPotions(state, playerId, 'FULL');

  return (
    <div
      className="wt-player-slot"
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        height: 44,
        border: `2px solid ${isCurrent ? color : '#555'}`,
        borderRadius: 4,
        background: isCurrent ? color + '22' : '#1f2229',
        color: '#eee',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: 10,
        padding: 2,
        boxSizing: 'border-box',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
        <span style={{ width: 8, height: 8, borderRadius: '50%', background: color, display: 'inline-block' }} />
        <strong>{playerId}</strong>
      </div>
      <div style={{ fontSize: 9, opacity: 0.85 }}>堡{inCastle}·满{full}</div>
      {hover && <PlayerPopover state={state} playerId={playerId} />}
    </div>
  );
}

function PlayerPopover({ state, playerId }: { state: GameState; playerId: PlayerID }) {
  const wizards = wizardsOfPlayer(state, playerId);
  const inCastle = wizards.filter((w) => w.state.mode === WizardStateType.IN_CASTLE).length;
  const total = wizards.length;
  const full = countPotions(state, playerId, 'FULL');
  const empty = countPotions(state, playerId, 'EMPTY');
  const spent = countPotions(state, playerId, 'SPENT');
  return (
    <div className="wt-player-popover">
      <div style={{ fontWeight: 'bold', marginBottom: 2 }}>{playerId}</div>
      <div>进堡：{inCastle}/{total}</div>
      <div>满 {full} · 空 {empty} · 已耗 {spent}</div>
    </div>
  );
}

function CurrentPlayerPanel({ state, playerId }: { state: GameState; playerId: PlayerID }) {
  const color = PLAYER_COLORS[playerId] ?? '#888';
  const wizards = wizardsOfPlayer(state, playerId);
  const inCastle = wizards.filter((w) => w.state.mode === WizardStateType.IN_CASTLE).length;
  const total = wizards.length;
  const full = countPotions(state, playerId, 'FULL');
  const empty = countPotions(state, playerId, 'EMPTY');
  const spent = countPotions(state, playerId, 'SPENT');
  return (
    <div
      style={{
        border: `2px solid ${color}`,
        borderRadius: 8,
        padding: 8,
        background: color + '18',
        boxShadow: `0 0 10px ${color}66`,
      }}
    >
      <div style={{ fontWeight: 'bold', color, fontSize: 13 }}>
        {playerId} ◀ 当前回合
      </div>
      <div style={{ fontSize: 12, color: '#ddd', marginTop: 4 }}>
        巫师进堡：{inCastle}/{total}
      </div>
      <div style={{ fontSize: 11, color: '#aaa', marginTop: 2 }}>
        药水：满 {full} · 空 {empty} · 已耗 {spent}
      </div>
    </div>
  );
}
