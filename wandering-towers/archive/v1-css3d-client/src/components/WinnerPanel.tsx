import type { GameState } from '@wt/shared';
import { PLAYER_COLORS } from '../game/config';

/** 胜负结算浮层：F02 羊皮卷轴 + F03 石雕角饰，替代原白色卡片。
 *  终局时 F01 双层发光熄灭，此处用金辉收束，与舞台同一套光位。 */
export function WinnerPanel({
  state,
  onNewGame,
}: {
  state: GameState;
  onNewGame: () => void;
}) {
  const winners = state.winners;
  const shared = state.sharedVictory;
  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(8,10,14,0.78)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 100,
      }}
    >
      <div
        className="va-panel"
        style={{ padding: '22px 30px', textAlign: 'center', borderColor: '#e8b339', minWidth: 280 }}
      >
        <div className="va-panel-title" style={{ margin: '-22px -30px 16px', padding: '6px 12px', textAlign: 'left' }}>
          终局结算
        </div>
        <h1 style={{ color: '#e8b339', margin: '0 0 6px', fontSize: 22, letterSpacing: 2, textShadow: '0 0 12px rgba(232,179,57,0.4)' }}>
          {shared ? '并列胜利' : '胜利'}
        </h1>
        <div style={{ fontSize: 24, margin: '14px 0' }}>
          {winners.map((w) => (
            <span key={w} style={{ color: PLAYER_COLORS[w] ?? '#f5e9c8', margin: '0 8px', textShadow: `0 0 10px ${PLAYER_COLORS[w] ?? '#fff'}66` }}>
              {w}
            </span>
          ))}
        </div>
        <div className="va-divider" style={{ margin: '0 0 12px' }} />
        <div style={{ fontSize: 11, color: '#d9c9a3', marginBottom: 10 }}>
          终局由 {state.endgameTriggerPlayerId ?? '—'} 在第 {state.endgameTriggerRound ?? '—'} 轮触发 · 打完本轮后结算
        </div>
        <table style={{ margin: '0 auto', borderCollapse: 'collapse', fontSize: 12, color: '#f5e9c8' }}>
          <thead>
            <tr>
              <th style={{ border: '1px solid rgba(122,108,80,0.7)', padding: '4px 10px' }}>玩家</th>
              <th style={{ border: '1px solid rgba(122,108,80,0.7)', padding: '4px 10px' }}>剩余满瓶</th>
            </tr>
          </thead>
          <tbody>
            {Object.entries(state.scores).map(([pid, score]) => (
              <tr key={pid}>
                <td style={{ border: '1px solid rgba(122,108,80,0.5)', padding: '4px 10px', color: PLAYER_COLORS[pid] }}>
                  {pid}
                </td>
                <td style={{ border: '1px solid rgba(122,108,80,0.5)', padding: '4px 10px' }}>{score}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <button
          className="va-stone-button"
          onClick={onNewGame}
          style={{ marginTop: 18, padding: '7px 18px', fontSize: 12, letterSpacing: 1 }}
        >
          开始新游戏
        </button>
      </div>
    </div>
  );
}
