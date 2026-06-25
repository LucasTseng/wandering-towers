import { useEffect, useRef } from 'react';
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

/** 行动日志面板 */
export function LogPanel({ events }: { events: GameEvent[] }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (ref.current) ref.current.scrollTop = ref.current.scrollHeight;
  }, [events]);

  const recent = events.slice(-30);
  return (
    <div
      ref={ref}
      style={{
        border: '1px solid #aaa',
        borderRadius: 8,
        padding: 6,
        background: '#fafafa',
        height: 200,
        overflowY: 'auto',
        fontSize: 11,
      }}
    >
      <div style={{ fontWeight: 'bold', marginBottom: 4 }}>📜 行动日志</div>
      {recent.map((e) => (
        <div key={e.eventId} style={{ borderBottom: '1px solid #eee', padding: '1px 0' }}>
          <span style={{ color: '#888' }}>#{e.sequence}</span>{' '}
          <span style={{ color: '#333' }}>{EVENT_ZH[e.type] ?? e.type}</span>{' '}
          {e.actorPlayerId && <span style={{ color: '#666' }}>({e.actorPlayerId})</span>}
        </div>
      ))}
    </div>
  );
}
