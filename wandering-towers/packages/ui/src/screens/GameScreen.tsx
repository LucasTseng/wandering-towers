import React from 'react';
import type { GameState, Player, Potion, SpellId } from '../../../../shared/src/types';
import { Board } from '../components/Board';
import { PlayerInfo } from '../components/PlayerInfo';
import { ControlPanel } from '../components/ControlPanel';
import './GameScreen.css';

interface PlayerPanelData {
  player: Player;
  potions: Potion[];
  isCurrentPlayer: boolean;
}

interface GameScreenProps {
  // Data props are now more specific, decoupling from engine selectors
  boardState: GameState;
  players: PlayerPanelData[];
  currentPlayerId: string;
  turnPhase: string;
  availableSpells: SpellId[];
  // A simplified command dispatcher for this task
  onEndTurn: () => void;
  onCastSpell: (spellId: SpellId, target?: any) => void;
  onWizardClick: (wizardId: string) => void;
  onTowerClick: (towerId: string) => void;
  onSpaceClick: (spaceIndex: number) => void;
}

export const GameScreen: React.FC<GameScreenProps> = ({
  boardState,
  players,
  currentPlayerId,
  turnPhase,
  availableSpells,
  onEndTurn,
  onCastSpell,
  onWizardClick,
  onTowerClick,
  onSpaceClick,
}) => {
  return (
    <div className="game-screen">
      <header className="game-header">
        <h1>Wandering Towers</h1>
      </header>
      <aside className="players-panel">
        <h2>Players</h2>
        {players.map(({ player, potions, isCurrentPlayer }) => (
          <PlayerInfo
            key={player.id}
            player={player}
            potions={potions}
            isCurrentPlayer={isCurrentPlayer}
          />
        ))}
      </aside>
      <main className="board-area">
        <Board
          state={boardState}
          onWizardClick={onWizardClick}
          onTowerClick={onTowerClick}
          onSpaceClick={onSpaceClick}
        />
      </main>
      <footer className="controls-area">
        <ControlPanel
          currentPlayerId={currentPlayerId}
          turnPhase={turnPhase}
          availableSpells={availableSpells}
          onEndTurn={onEndTurn}
          onCastSpell={onCastSpell}
        />
      </footer>
    </div>
  );
};