import type { GameState, PlayerID } from '@wt/shared';
import { countPotions, wizardsOfPlayer } from '@wt/engine';
import { PLAYER_COLORS } from '../game/config';
import { WizardStateType } from '@wt/shared';

interface PlayerInfoProps {
  state: GameState;
  playerId: PlayerID;
  isCurrent: boolean;
}

/** 回放视图里的玩家信息：F02 石框 + F06 状态徽记，替代原白色卡片。 */
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
      className="va-panel"
      style={{
        padding: '7px 9px',
        margin: '0 0 6px',
        borderColor: isCurrent ? color : '#7a6c50',
        boxShadow: isCurrent ? `0 0 9px ${color}55` : undefined,
      }}
    >
      <div style={{ fontWeight: 'bold', color, fontSize: 12 }}>
        {playerId} {isCurrent && '◀ 当前'}
      </div>
      <div style={{ fontSize: 11, margin: '4px 0', color: '#f5e9c8' }}>
        巫师进堡：{inCastle}/{total}
      </div>
      <div style={{ display: 'flex', gap: 3, alignItems: 'center', flexWrap: 'wrap' }}>
        {potions.map((ps, i) => (
          <div
            key={i}
            title={ps}
            style={{
              width: 12,
              height: 12,
              borderRadius: '50%',
              background:
                ps === 'FULL'
                  ? `radial-gradient(circle at 34% 28%, rgba(255,255,255,0.55), ${color} 58%, rgba(0,0,0,0.4))`
                  : ps === 'SPENT'
                    ? '#4a505c'
                    : 'rgba(143,160,168,0.45)',
              border: '1px solid rgba(20,22,28,0.6)',
              boxShadow: ps === 'FULL' ? `0 0 5px ${color}88` : undefined,
            }}
          />
        ))}
      </div>
      <div style={{ fontSize: 10, color: '#b8bcc6', marginTop: 4 }}>
        满 {full} · 空 {empty} · 已耗 {spent}
      </div>
      {empty > 0 && (
        <div style={{ fontSize: 10, color: '#e88fa3', marginTop: 2 }}>终局需空瓶=0，当前剩 {empty}</div>
      )}
    </div>
  );
}
