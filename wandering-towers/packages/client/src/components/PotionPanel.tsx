import type { GameState, PlayerID, PotionState } from '@wt/shared';
import { PotionState as PS } from '@wt/shared';
import { PLAYER_COLORS } from '../game/config';

interface PotionPanelProps {
  state: GameState;
  playerId: PlayerID;
}

/** 魔法药水区（简洁药水瓶样式）
 * 三态：满药水(蓝) / 空瓶(白) / 已使用(灰) */
export function PotionPanel({ state, playerId }: PotionPanelProps) {
  const player = state.players[playerId];
  if (!player) return null;
  const color = PLAYER_COLORS[playerId] ?? '#888';
  const states: PotionState[] = player.potionIds.map((pid) => state.potions[pid]?.state ?? PS.EMPTY);
  const full = states.filter((s) => s === PS.FULL).length;
  const empty = states.filter((s) => s === PS.EMPTY).length;
  const spent = states.filter((s) => s === PS.SPENT).length;

  return (
    <div style={{ border: `1px solid ${color}`, borderRadius: 6, padding: 6, background: 'rgba(20,22,28,0.92)', color: '#f4ead1' }}>
      <div style={{ fontWeight: 'bold', marginBottom: 4, fontSize: 12, color }}>
        魔法药水（{playerId}）
      </div>
      <div style={{ display: 'flex', gap: 3, flexWrap: 'wrap', marginBottom: 4 }}>
        {states.map((ps, i) => (
          <PotionBottle key={i} state={ps} />
        ))}
      </div>
      <div style={{ fontSize: 10, color: '#a0a8b8' }}>
        满 {full} · 空 {empty} · 已耗 {spent}
      </div>
    </div>
  );
}

/** 简洁药水瓶 */
function PotionBottle({ state }: { state: PotionState }) {
  const isFull = state === PS.FULL;
  const isSpent = state === PS.SPENT;

  const bgColor = isFull ? '#3498db' : isSpent ? '#aaa' : '#fff';

  return (
    <div
      title={isFull ? '满药水' : isSpent ? '已耗' : '空瓶'}
      style={{
        width: 18,
        height: 22,
        borderRadius: '3px 3px 4px 4px',
        background: bgColor,
        border: '1px solid rgba(100,100,100,0.4)',
        boxShadow: '0 1px 2px rgba(0,0,0,0.2)',
        position: 'relative',
      }}
    >
      {/* 瓶塞 */}
      <div
        style={{
          position: 'absolute',
          top: -2,
          left: '50%',
          transform: 'translateX(-50%)',
          width: 6,
          height: 3,
          background: '#555',
          borderRadius: 1,
        }}
      />
    </div>
  );
}
