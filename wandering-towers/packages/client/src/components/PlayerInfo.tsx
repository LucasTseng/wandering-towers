import type { GameState, PlayerID } from '@wt/shared';
import { countPotions, wizardsOfPlayer } from '@wt/engine';
import { PLAYER_COLORS } from '../game/config';
import { WizardStateType } from '@wt/shared';

interface PlayerInfoProps {
  state: GameState;
  playerId: PlayerID;
  isCurrent: boolean;
}

/** 玩家信息：药水三态、巫师进度、终局空瓶提示 */
export function PlayerInfo({ state, playerId, isCurrent }: PlayerInfoProps) {
  const player = state.players[playerId];
  if (!player) return null;
  const color = PLAYER_COLORS[playerId] ?? '#888';
  const full = countPotions(state, playerId, 'FULL');
  const empty = countPotions(state, playerId, 'EMPTY');
  const spent = countPotions(state, playerId, 'SPENT');
  const wizards = wizardsOfPlayer(state, playerId);
  const inCastle = wizards.filter((w) => w.state.mode === WizardStateType.IN_CASTLE).length;
  const total = wizards.length;
  const potions = player.potionIds.map((pid) => state.potions[pid]?.state ?? 'EMPTY');

  return (
    <div
      style={{
        border: `2px solid ${isCurrent ? color : '#ccc'}`,
        borderRadius: 8,
        padding: 8,
        margin: 4,
        background: isCurrent ? '#fffde7' : '#fff',
        boxShadow: isCurrent ? `0 0 8px ${color}` : 'none',
      }}
    >
      <div style={{ fontWeight: 'bold', color }}>
        {playerId} {isCurrent && '◀ 当前'}
      </div>
      <div style={{ fontSize: 12, margin: '4px 0' }}>
        巫师进堡：{inCastle}/{total}
      </div>
      <div style={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
        {potions.map((ps, i) => (
          <div
            key={i}
            title={ps}
            style={{
              width: 14,
              height: 14,
              borderRadius: '50%',
              background: ps === 'FULL' ? '#3498db' : ps === 'SPENT' ? '#bbb' : '#fff',
              border: '1px solid #555',
            }}
          />
        ))}
      </div>
      <div style={{ fontSize: 11, color: '#666', marginTop: 4 }}>
        满 {full} · 空 {empty} · 已耗 {spent}
      </div>
      {empty > 0 && (
        <div style={{ fontSize: 11, color: '#c0392b' }}>终局需空瓶=0，当前剩 {empty}</div>
      )}
    </div>
  );
}
