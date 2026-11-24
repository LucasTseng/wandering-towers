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

/** F01 / F04 / F06 玩家信息区：与手牌 / 药水 / 法术三区共用同一石框与节奏。
 *  玩家色仅用于状态徽记与双层发光，六色严格取 config.ts。 */
export function PlayerBar({ state, currentId }: PlayerBarProps) {
  const slots: (PlayerID | null)[] = [...state.playerOrder];
  while (slots.length < MAX_SLOTS) slots.push(null);
  const current = state.players[currentId];

  return (
    <div className="va-panel" style={{ display: 'flex', flexDirection: 'column', gap: 4, padding: 6 }}>
      <div style={{ display: 'grid', gridTemplateColumns: `repeat(${MAX_SLOTS}, 1fr)`, gap: 3 }}>
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
    return (
      <div
        style={{
          height: 44,
          border: '1px dashed rgba(122,108,80,0.55)',
          borderRadius: 4,
          background: 'rgba(27,31,40,0.45)',
          opacity: 0.65,
        }}
      />
    );
  }
  const color = PLAYER_COLORS[playerId] ?? '#888';
  const wizards = wizardsOfPlayer(state, playerId);
  const inCastle = wizards.filter((w) => w.state.mode === WizardStateType.IN_CASTLE).length;
  const empty = countPotions(state, playerId, 'EMPTY');

  return (
    <div
      className="wt-player-slot"
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        height: 44,
        border: `1px solid ${isCurrent ? color : 'rgba(122,108,80,0.7)'}`,
        borderRadius: 4,
        background: isCurrent
          ? `linear-gradient(180deg, ${color}33, rgba(27,31,40,0.92))`
          : 'linear-gradient(180deg, #2c303b, #1c202a)',
        color: '#f5e9c8',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: 10,
        padding: 2,
        boxSizing: 'border-box',
        boxShadow: isCurrent
          ? `0 0 8px ${color}66, inset 0 1px 0 rgba(255,240,205,0.14)`
          : 'inset 0 1px 0 rgba(255,240,205,0.06)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
        {/* B01 米宝小徽记：木质哑光圆点，替代纯色圆 */}
        <span
          style={{
            width: 9,
            height: 9,
            borderRadius: '50%',
            background: `radial-gradient(circle at 34% 28%, rgba(255,255,255,0.55), ${color} 58%, rgba(0,0,0,0.45))`,
            border: '1px solid rgba(0,0,0,0.35)',
            boxShadow: isCurrent ? `0 0 5px ${color}aa` : undefined,
            display: 'inline-block',
          }}
        />
        <strong>{playerId}</strong>
      </div>
      <div style={{ fontSize: 9, opacity: 0.82, color: '#d9c9a3' }}>堡{inCastle}/{wizards.length}·空{empty}</div>
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
  // 「所有巫师进堡」时，进堡前置条件已保证空瓶数为 0，双条件必然同时达成。
  // 因此空瓶不是与进堡并列的终局条件，而是最后一名巫师进堡前的前置门槛。
  const endgameReady = inCastle === total;
  const lastWizardNeedsPotions = total - inCastle === 1 && empty > 0;
  return (
    <div
      style={{
        border: `1px solid ${color}`,
        borderRadius: 6,
        padding: '6px 8px',
        background: `linear-gradient(135deg, ${color}22, rgba(27,31,40,0.9))`,
        boxShadow: `0 0 10px ${color}55, inset 0 1px 0 rgba(255,240,205,0.12)`,
      }}
    >
      <div style={{ fontWeight: 'bold', color, fontSize: 12 }}>
        {playerId} ◀ 当前回合
      </div>
      <div style={{ fontSize: 11, color: '#f5e9c8', marginTop: 3 }}>
        巫师进堡：{inCastle}/{total}
      </div>
      <div style={{ fontSize: 10, color: '#b8bcc6', marginTop: 2 }}>
        药水：满 {full} · 空 {empty} · 已耗 {spent}
      </div>
      <div
        title="终局：所有巫师进鸦堡即达成（进堡前置条件保证此时已无空瓶）。同轮多人达成时比较剩余满瓶（FULL）数，相同则并列胜利。"
        style={{ fontSize: 10, color: '#d9c9a3', marginTop: 3, lineHeight: 1.45 }}
      >
        终局进度：进堡 {inCastle}/{total}
        {endgameReady && <span style={{ color: '#a8d84a', marginLeft: 5 }}>已达成</span>}
        {state.endgameTriggered && (
          <span style={{ color: '#e8b339', marginLeft: 5 }}>终局已触发 · 本轮结束后结算</span>
        )}
      </div>
      {/* 前置条件只是进度说明，不是常驻警告：真正拦截与提示发生在玩家点巫师进堡的那一刻 */}
      {lastWizardNeedsPotions && (
        <div style={{ fontSize: 10, color: '#e8b339', marginTop: 2, lineHeight: 1.4 }}>
          进堡前置：还有 {empty} 个空瓶（需 0）
        </div>
      )}
    </div>
  );
}
