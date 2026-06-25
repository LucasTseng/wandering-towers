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

/** 手牌面板 */
export function HandPanel({ state, playerId, selectedCardId, onCardClick, disabled }: HandPanelProps) {
  const player = state.players[playerId];
  if (!player) return null;
  return (
    <div style={{ border: '1px solid #2980b9', borderRadius: 8, padding: 8, background: '#ebf5fb' }}>
      <div style={{ fontWeight: 'bold', marginBottom: 4 }}>🃏 手牌（{playerId}）</div>
      <div style={{ display: 'flex', gap: 6 }}>
        {player.hand.map((cardId) => {
          const tmpl = getCardTemplate(state, cardId);
          const isWizard = tmpl?.type === MovementCardType.MOVE_WIZARD;
          const isTower = tmpl?.type === MovementCardType.MOVE_TOWER;
          const isEither = tmpl?.type === MovementCardType.MOVE_WIZARD_OR_TOWER;
          return (
            <button
              key={cardId}
              onClick={() => onCardClick?.(cardId)}
              disabled={disabled}
              style={{
                width: 56,
                height: 72,
                border: selectedCardId === cardId ? '3px solid gold' : '1px solid #555',
                background: isWizard ? '#d4edda' : isTower ? '#f8d7da' : isEither ? '#fff3cd' : '#eee',
                borderRadius: 6,
                cursor: disabled ? 'not-allowed' : 'pointer',
                fontSize: 11,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                opacity: disabled ? 0.5 : 1,
              }}
            >
              <div style={{ fontWeight: 'bold' }}>{cardLabel(state, cardId)}</div>
              <div style={{ fontSize: 9, color: '#666' }}>{cardId.slice(-4)}</div>
            </button>
          );
        })}
        {player.hand.length === 0 && <div style={{ color: '#888' }}>无手牌</div>}
      </div>
    </div>
  );
}
