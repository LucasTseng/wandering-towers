import { useState, useCallback, useMemo } from 'react';
import { RuleEngine } from '../../../engine/src/rule-engine';
import { buildInitialState } from '../../../engine/src/state/state-builder';
import { applyEvent } from '../../../engine/src/events/apply-event';
import type { GameConfig, GameState, GameCommand } from '../../../../shared/src/types';

export const useGame = (config: GameConfig, seed: string) => {
  // Initialize the game state only once, memoized for stability.
  const initialState = useMemo(() => buildInitialState(config, seed), [config, seed]);
    const [state, setState] = useState<GameState>(initialState);

  const dispatch = useCallback((command: GameCommand) => {
    // Use functional update to get the latest state without depending on it.
    setState(currentState => {
      const engine = new RuleEngine(currentState);

      try {
        const { success, events } = engine.execute(command);

        if (success) {
          let newState = JSON.parse(JSON.stringify(currentState)); // Deep copy for immutability
          for (const event of events) {
            newState = applyEvent(newState, event);
          }
          return newState;
        }
      } catch (error) {
        console.error('RuleEngine Error:', error);
      }

      // If execution fails, return the original state.
      return currentState;
    });
  }, []); // Now dispatch has a stable reference throughout the component's lifecycle.

  return { state, dispatch };
};

