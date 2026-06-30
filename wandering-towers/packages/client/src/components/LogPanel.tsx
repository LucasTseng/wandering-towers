import { useEffect, useRef, useState } from 'react';
import type { GameEvent } from '@wt/shared';

const EVENT_ZH: Record<string, string> = {
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

/** 行动日志面板（§10.6）：角落图标，点击展开浮层，可收起。默认收起。 */
export function LogPanel({ events }: { events: GameEvent[] }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (ref.current) ref.current.scrollTop = ref.current.scrollHeight;
  }, [events, open]);

  const recent = events.slice(-60);

  return (
    <>
      <button
        className="wt-log-icon"
        onClick={() => setOpen((v) => !v)}
        title="行动日志"
        data-interactive
      >
        📜
      </button>
      {open && (
        <div className="wt-log-panel">
          <div className="wt-log-head">
            <span>📜 行动日志</span>
            <button className="wt-log-close" onClick={() => setOpen(false)} title="收起" data-interactive>
              ✕
            </button>
          </div>
          <div ref={ref} className="wt-log-body">
            {recent.map((e) => (
              <div key={e.eventId} className="wt-log-row">
                <span style={{ color: '#888' }}>#{e.sequence}</span>{' '}
                <span style={{ color: '#ddd' }}>{EVENT_ZH[e.type] ?? e.type}</span>{' '}
                {e.actorPlayerId && <span style={{ color: '#999' }}>({e.actorPlayerId})</span>}
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  );
}
