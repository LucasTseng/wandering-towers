import type { GameState, PlayerID } from '@wt/shared';
import { playerColor, playerName } from '../scene/pieces';

export function WinnerOverlay({ state, onNewGame }: { state: GameState; onNewGame: () => void }) {
  const winners = state.winners;
  const shared = state.sharedVictory;
  const order = state.playerOrder.length > 0 ? state.playerOrder : (Object.keys(state.players) as PlayerID[]);
  return (
    <div className="winner-overlay" role="dialog" aria-modal="true">
      <div className="winner-card">
        <div className="winner-kicker">FINALE · RAVENSKEEP</div>
        <h1 className="winner-title">{shared ? '并列胜利' : '巫师归堡'}</h1>
        <div className="winner-sub">
          所有巫师进入鸦堡且药水耗尽者获胜；结算比剩余满瓶数
          {state.endgameTriggerRound !== null && (
            <>
              <br />
              终局由 {state.endgameTriggerPlayerId ?? '—'} 在第 {state.endgameTriggerRound} 轮触发，打完本轮后结算
            </>
          )}
        </div>

        <div className="winner-scores">
          {order.map((pid) => {
            const isWinner = winners.includes(pid);
            return (
              <div className={`winner-row${isWinner ? ' is-winner' : ''}`} key={pid}>
                <i className="winner-dot" style={{ background: playerColor(pid) }} />
                <span>
                  {pid} · {playerName(pid)}
                </span>
                {isWinner && <span style={{ color: '#8a6327', fontWeight: 600 }}>胜者</span>}
                <strong>{state.scores[pid] ?? 0} 满瓶</strong>
              </div>
            );
          })}
        </div>

        <div className="winner-actions">
          <button className="end-turn" type="button" onClick={onNewGame}>
            开始新游戏
          </button>
        </div>
      </div>
    </div>
  );
}

export const EVENT_ZH: Record<string, string> = {
  TURN_STARTED: '回合开始',
  ACTION_PHASE_CHANGED: '阶段切换',
  TURN_ENDED: '回合结束',
  ROUND_ENDED: '轮次结束',
  PLAYER_TURN_STATS_RESET: '回合计数重置',
  CARD_PLAYED: '出牌',
  CARD_DISCARDED: '弃牌',
  CARDS_DRAWN: '抽牌',
  DISCARD_RESHUFFLED_TO_DRAW: '弃牌堆洗回',
  DISCARD_PILE_RESHUFFLED: '弃牌堆洗牌',
  WIZARD_MOVED: '巫师移动',
  WIZARD_ENTERED_CASTLE: '巫师进堡',
  WIZARD_IMPRISONED: '巫师被封印',
  WIZARD_RELEASED: '巫师被解封',
  TOWER_SLICE_MOVED: '塔切片移动',
  TOWER_STACK_REBUILT: '塔堆重建',
  TOWER_SEALED: '塔被锁定',
  TOWER_UNSEALED: '塔解除锁定',
  RAVEN_CASTLE_MOVED: '城堡移动',
  POTION_FILLED: '药水填满',
  POTION_SPENT: '药水消耗',
  SPELL_CAST: '施法',
  SPELL_EFFECT_APPLIED: '法术生效',
  ENDGAME_TRIGGERED: '终局触发',
  WINNER_DETERMINED: '胜者确定',
  GAME_ENDED: '游戏结束',
  INIT_COMPLETED: '初始化完成',
};

export function LogDrawer({
  events,
  open,
  onToggle,
}: {
  events: { eventId: string; sequence: number; type: string; actorPlayerId?: string | null | undefined }[];
  open: boolean;
  onToggle: () => void;
}) {
  const recent = events.slice(-80);
  return (
    <>
      <button className="log-toggle" type="button" onClick={onToggle} title="行动日志">
        <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M5 4h14v16H5z" />
          <path d="M8 8h8M8 12h8M8 16h5" />
        </svg>
        行动日志 · <strong>{recent.length}</strong>
      </button>
      {open && (
        <div className="log-drawer">
          <div className="log-drawer-head">
            <span>行动日志</span>
            <button type="button" onClick={onToggle} title="收起">
              ✕
            </button>
          </div>
          <div className="log-list">
            {recent.map((event) => (
              <div className="log-item" key={event.eventId}>
                <span className="log-seq">#{event.sequence}</span>
                <span className="log-type">{EVENT_ZH[event.type] ?? event.type}</span>
                {event.actorPlayerId && <span>{event.actorPlayerId}</span>}
              </div>
            ))}
            {recent.length === 0 && <div className="log-item">暂无事件</div>}
          </div>
        </div>
      )}
    </>
  );
}
