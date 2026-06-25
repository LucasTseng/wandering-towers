import type { GameState } from '@wt/shared';
import { PLAYER_COLORS } from '../game/config';

/** 胜负结算页 */
export function WinnerPanel({ state }: { state: GameState }) {
  const winners = state.winners;
  const shared = state.sharedVictory;
  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.7)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 100,
      }}
    >
      <div style={{ background: '#fff', padding: 32, borderRadius: 12, textAlign: 'center' }}>
        <h1 style={{ color: '#d4af37' }}>
          {shared ? '并列胜利' : '胜利'}
        </h1>
        <div style={{ fontSize: 24, margin: '16px 0' }}>
          {winners.map((w) => (
            <span key={w} style={{ color: PLAYER_COLORS[w] ?? '#333', margin: '0 8px' }}>
              {w}
            </span>
          ))}
        </div>
        <table style={{ margin: '0 auto', borderCollapse: 'collapse', fontSize: 14 }}>
          <thead>
            <tr>
              <th style={{ border: '1px solid #ccc', padding: '4px 8px' }}>玩家</th>
              <th style={{ border: '1px solid #ccc', padding: '4px 8px' }}>剩余满瓶</th>
            </tr>
          </thead>
          <tbody>
            {Object.entries(state.scores).map(([pid, score]) => (
              <tr key={pid}>
                <td style={{ border: '1px solid #ccc', padding: '4px 8px', color: PLAYER_COLORS[pid] }}>
                  {pid}
                </td>
                <td style={{ border: '1px solid #ccc', padding: '4px 8px' }}>{score}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <button
          onClick={() => window.location.reload()}
          style={{ marginTop: 16, padding: '8px 16px', fontSize: 14, cursor: 'pointer' }}
        >
          再来一局
        </button>
      </div>
    </div>
  );
}
