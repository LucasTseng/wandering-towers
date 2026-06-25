import React from 'react';
import type { Player, Potion } from '../../../../shared/src/types';

interface PlayerInfoProps {
  player: Player;
  potions: Potion[];
  isCurrentPlayer: boolean;
}

export const PlayerInfo: React.FC<PlayerInfoProps> = React.memo(({ player, potions, isCurrentPlayer }) => {
  const fullPotions = potions.filter(p => p.state === 'FULL').length;
  const emptyPotions = potions.filter(p => p.state === 'EMPTY').length;

  return (
    <div className={`player-info ${isCurrentPlayer ? 'current-player' : ''}`}>
      <h3>{player.id} {isCurrentPlayer && ' (Current)'}</h3>
      <p>Wizards in Castle: {player.wizardsInCastle}</p>
      <div className="potions-display">
        <span>Potions:</span>
        {Array(fullPotions).fill(0).map((_, i) => <div key={`full-${i}`} className="potion full" />)}
        {Array(emptyPotions).fill(0).map((_, i) => <div key={`empty-${i}`} className="potion empty" />)}
      </div>
    </div>
  );
});