import React from 'react';
import type { SpellId } from '../../../../shared/src/types';

interface ControlPanelProps {
  currentPlayerId: string;
  turnPhase: string;
  availableSpells: SpellId[];
  onEndTurn: () => void;
  onCastSpell: (spellId: SpellId) => void;
}

export const ControlPanel: React.FC<ControlPanelProps> = React.memo(({
  currentPlayerId,
  turnPhase,
  availableSpells,
  onEndTurn,
  onCastSpell,
}) => {
  return (
    <div className="control-panel">
      <h4>Controls</h4>
      <p>Current Player: {currentPlayerId}</p>
      <p>Phase: {turnPhase}</p>
      <div className="actions">
        <button onClick={onEndTurn}>End Turn</button>
      </div>
      <div className="spells">
        <h5>Available Spells</h5>
        {availableSpells.map(spellId => (
          <button key={spellId} onClick={() => onCastSpell(spellId)}>
            Cast {spellId.replace(/_/g, ' ')}
          </button>
        ))}
      </div>
    </div>
  );
});