import React, { useMemo, useState, useCallback } from 'react';
import { useGame } from '../hooks/useGame';
import { GameScreen } from '../screens/GameScreen';
import { getPlayer, getPotionsByPlayer } from '../../../engine/src/state/selectors';
import type { GameConfig, SpellId, SpellPayload } from '../../../../shared/src/types';

// Defines the user's current multi-step action
type UIIntent =
  | { type: 'IDLE' }
  | {
      type: 'CAST_SPELL';
      spellId: SpellId;
      // Stores partial target information as the user clicks on things
      payload: Partial<SpellPayload['targetDecision']>;
    };

const defaultConfig: GameConfig = {
  playerCount: 2,
  board: { spaces: 12 },
  towers: { count: 6, colors: ['red', 'green', 'blue', 'yellow', 'purple', 'orange'] },
  wizards: { perPlayer: 2 },
  potions: { perPlayer: 6 },
  cards: { initialHand: 3, templates: [] },
  spellSetup: {
    mode: 'FIXED',
    selectedSpellIds: ['MOVE_WIZARD_1', 'MOVE_TOWER_2', 'FREE_A_WIZARD', 'MOVE_RAVEN_CASTLE', 'SWAP_TWO_TOWERS', 'DRAW_CARD', 'REUSE_LAST_CARD'],
    maxSpellsPerTurn: 1,
    spellCount: 7,
  },
  ravenCastle: {
    maxHeight: 6,
    startPosition: 11,
  },
};

export const GameContainer: React.FC = () => {
  const { state, dispatch } = useGame(defaultConfig, 'initial-seed');
  const [intent, setIntent] = useState<UIIntent>({ type: 'IDLE' });

  // This is the "connector" logic that derives props for the pure UI component.
  // It correctly belongs in the container, not the presentation component.
  const playersData = useMemo(() => {
    return state.playerOrder.map(playerId => ({
      player: getPlayer(state, playerId),
      potions: getPotionsByPlayer(state, playerId),
      isCurrentPlayer: state.currentPlayerId === playerId,
    }));
  }, [state.playerOrder, state.players, state.potions, state.currentPlayerId]);

  const handleEndTurn = useCallback(() => {
    dispatch({ type: 'END_TURN', playerId: state.currentPlayerId });
    setIntent({ type: 'IDLE' }); // Reset intent on turn end
  }, [dispatch, state.currentPlayerId]);

  const handleCastSpell = useCallback((spellId: SpellId) => {
    // Spells that require no target can be dispatched immediately.
    if (spellId === 'DRAW_CARD' || spellId === 'MOVE_RAVEN_CASTLE') {
      dispatch({
        type: 'CAST_SPELL',
        playerId: state.currentPlayerId,
        payload: { spellId, targetDecision: {} },
      });
    } else {
      // For other spells, we set the intent and wait for user input.
      console.log(`Awaiting target for spell: ${spellId}`);
      setIntent({ type: 'CAST_SPELL', spellId, payload: {} });
    }
  }, [dispatch, state.currentPlayerId]);

  const handleWizardClick = useCallback((wizardId: string) => {
    if (intent.type !== 'CAST_SPELL') {
      console.log('Wizard clicked (no action pending):', wizardId);
      return;
    }

    // --- Spell-specific targeting logic ---

    // Case: FREE_A_WIZARD (single wizard click completes the spell)
    if (intent.spellId === 'FREE_A_WIZARD') {
      console.log(`Dispatching FREE_A_WIZARD for wizard ${wizardId}`);
      dispatch({
        type: 'CAST_SPELL',
        playerId: state.currentPlayerId,
        payload: {
          spellId: 'FREE_A_WIZARD',
          targetDecision: { wizardId },
        },
      });
      setIntent({ type: 'IDLE' });
      return;
    }

    // Case: Spells that need a wizard as the first step (MOVE_WIZARD_1, REUSE_LAST_CARD etc.)
    // For REUSE_LAST_CARD, this only handles the wizard movement case. A full
    // implementation would need to inspect the last card and might require a different flow.
    if (['MOVE_WIZARD_1', 'REUSE_LAST_CARD'].includes(intent.spellId)) {
      console.log(`Wizard ${wizardId} selected for spell ${intent.spellId}`);
      setIntent({ ...intent, payload: { ...intent.payload, wizardId } });
    }
  }, [dispatch, state.currentPlayerId, intent]);

  const handleTowerClick = useCallback((towerId: string) => {
    if (intent.type === 'CAST_SPELL' && intent.spellId === 'MOVE_TOWER_2') {
      console.log(`Tower ${towerId} selected for MOVE_TOWER_2. Awaiting step selection.`);
      setIntent({ ...intent, payload: { towerId } });
    }
  }, [intent]);

  const handleSpaceClick = useCallback((spaceIndex: number) => {
    if (intent.type !== 'CAST_SPELL') {
      console.log('Space clicked (no action pending):', spaceIndex);
      return;
    }

    // --- Spell-specific targeting logic ---

    // Case: SWAP_TWO_TOWERS (requires two space clicks)
    if (intent.spellId === 'SWAP_TWO_TOWERS') {
      if (intent.payload.spaceIndex1 === undefined) {
        // This is the first space selection
        console.log(`First space ${spaceIndex} selected for SWAP_TWO_TOWERS.`);
        setIntent({ ...intent, payload: { spaceIndex1: spaceIndex } });
      } else {
        // This is the second space selection, completing the spell
        console.log(`Second space ${spaceIndex} selected. Dispatching SWAP_TWO_TOWERS.`);
        dispatch({ type: 'CAST_SPELL', playerId: state.currentPlayerId, payload: { spellId: 'SWAP_TWO_TOWERS', targetDecision: { ...intent.payload, spaceIndex2: spaceIndex } } });
        setIntent({ type: 'IDLE' });
      }
      return; // End of logic for this spell
    }

    // Case: Spells needing a wizard then a space (e.g., MOVE_WIZARD_1)
    if (intent.payload.wizardId) {
      console.log(`Space ${spaceIndex} selected to complete spell ${intent.spellId}`);
      dispatch({
        type: 'CAST_SPELL',
        playerId: state.currentPlayerId,
        payload: {
          spellId: intent.spellId,
          targetDecision: { ...intent.payload, spaceIndex } as SpellPayload['targetDecision'],
        },
      });
      setIntent({ type: 'IDLE' });
      return; // End of logic for this spell
    }

  }, [dispatch, state.currentPlayerId, intent]);

  const handleMoveTowerSteps = useCallback((steps: 1 | 2) => {
    if (intent.type === 'CAST_SPELL' && intent.spellId === 'MOVE_TOWER_2' && intent.payload.towerId) {
      console.log(`Dispatching MOVE_TOWER_2 for tower ${intent.payload.towerId} with ${steps} steps.`);
      dispatch({
        type: 'CAST_SPELL',
        playerId: state.currentPlayerId,
        payload: {
          spellId: 'MOVE_TOWER_2',
          targetDecision: { ...intent.payload, steps } as SpellPayload['targetDecision'],
        },
      });
      setIntent({ type: 'IDLE' });
    }
  }, [dispatch, state.currentPlayerId, intent]);

  return (
    <GameScreen
      boardState={state}
      players={playersData}
      currentPlayerId={state.currentPlayerId}
      turnPhase={state.turnPhase}
      availableSpells={state.availableSpells}
      onEndTurn={handleEndTurn}
      onCastSpell={handleCastSpell}
      onWizardClick={handleWizardClick}
      onTowerClick={handleTowerClick}
      onSpaceClick={handleSpaceClick}
    />
  );
};