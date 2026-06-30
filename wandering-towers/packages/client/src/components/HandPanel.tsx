import type { GameState, PlayerID, CardID } from '@wt/shared';
import { cardLabel, getCardTemplate } from '../game/cardHelper';
import { MovementCardType } from '@wt/shared';

interface HandPanelProps {
  state: GameState;
  playerId: PlayerID;
  selectedCardId?: CardID | null;
  onCardClick?: (cardId: CardID) => void;
  disabled?: boolean;
}

/** 手牌面板（简洁卡牌样式） */
export function HandPanel({ state, playerId, selectedCardId, onCardClick, disabled }: HandPanelProps) {
  const player = state.players[playerId];
  if (!player) return null;
  return (
    <div style={{ border: '1px solid #2980b9', borderRadius: 6, padding: 6, background: 'rgba(20,22,28,0.92)', color: '#f4ead1' }}>
      <div style={{ fontWeight: 'bold', marginBottom: 4, fontSize: 12 }}>手牌（{playerId}）</div>
      <div style={{ display: 'flex', gap: 4 }}>
        {player.hand.map((cardId) => {
          const tmpl = getCardTemplate(state, cardId);
          const isWizard = tmpl?.type === MovementCardType.MOVE_WIZARD;
          const isTower = tmpl?.type === MovementCardType.MOVE_TOWER;
          const isEither = tmpl?.type === MovementCardType.MOVE_WIZARD_OR_TOWER;
          const isSelected = selectedCardId === cardId;
          return (
            <button
              key={cardId}
              onClick={() => onCardClick?.(cardId)}
              disabled={disabled}
              style={{
                width: 48,
                height: 60,
                border: isSelected ? '2px solid gold' : '1px solid rgba(150,150,150,0.4)',
                background: isWizard ? '#d4edda' : isTower ? '#f8d7da' : isEither ? '#fff3cd' : '#eee',
                borderRadius: 4,
                cursor: disabled ? 'not-allowed' : 'pointer',
                fontSize: 10,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                opacity: disabled ? 0.5 : 1,
                boxShadow: isSelected ? '0 0 4px gold' : '0 1px 2px rgba(0,0,0,0.2)',
                transform: isSelected ? 'translateY(-2px)' : 'none',
                transition: 'transform 100ms ease',
              }}
            >
              <div style={{ fontWeight: 'bold', color: '#2c3e50' }}>{cardLabel(state, cardId)}</div>
              <div style={{ fontSize: 8, color: '#7f8c8d' }}>{cardId.slice(-4)}</div>
            </button>
          );
        })}
        {player.hand.length === 0 && <div style={{ color: '#7f8c8d' }}>无手牌</div>}
      </div>
    </div>
  );
}
