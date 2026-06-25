import React from 'react';
import type { GameState } from '../../../../shared/src/types';
import { getTowerStack, getWizardsAt } from '../../../engine/src/state/selectors';
import { Space } from './Space';
import './Board.css';

interface BoardProps {
  state: GameState;
  onWizardClick?: (wizardId: string) => void;
  onTowerClick?: (towerId: string) => void;
  onSpaceClick?: (spaceIndex: number) => void;
}

export const Board: React.FC<BoardProps> = ({
  state,
  onWizardClick,
  onTowerClick,
  onSpaceClick,
}) => {
  const boardRadius = 250; // in pixels
  const spaceCount = state.board.spaces.length;

  return (
    <div className="board-container">
      <div className="board" style={{ width: boardRadius * 2, height: boardRadius * 2 }}>
        {state.board.spaces.map((space, index) => {
          const angle = (index / spaceCount) * 2 * Math.PI - Math.PI / 2;
          const x = boardRadius + boardRadius * Math.cos(angle) - 40; // 40 is half of space width
          const y = boardRadius + boardRadius * Math.sin(angle) - 40; // 40 is half of space height

          const towerStack = getTowerStack(state, space.index);
          const wizardsOnGround = getWizardsAt(state, space.index).filter(
            w => w.position.mode === 'ON_GROUND'
          );
          const wizardOnTop = getWizardsAt(state, space.index).find(
            w => w.position.mode === 'ON_TOWER_TOP'
          );

          return (
            <div
              key={space.index}
              className="space-wrapper"
              style={{
                transform: `translate(${x}px, ${y}px)`,
              }}
            >
              <Space
                space={space}
                towerStack={towerStack}
                wizardsOnGround={wizardsOnGround}
                wizardOnTop={wizardOnTop}
                onWizardClick={onWizardClick}
                onTowerClick={onTowerClick}
                onSpaceClick={onSpaceClick}
              />
            </div>
          );
        })}
        <div className="board-center">
          <span>Raven Castle</span>
        </div>
      </div>
    </div>
  );
};