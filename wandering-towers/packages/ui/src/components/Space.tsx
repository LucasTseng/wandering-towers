import React from 'react';
import type { BoardSpace, Tower, Wizard } from '../../../../shared/src/types';
import { TowerComponent } from './Tower';
import { WizardComponent } from './Wizard';

interface SpaceProps {
  space: BoardSpace;
  towerStack: Tower[];
  wizardsOnGround: Wizard[];
  wizardOnTop?: Wizard;
  onWizardClick?: (wizardId: string) => void;
  onTowerClick?: (towerId: string) => void;
  onSpaceClick?: (spaceIndex: number) => void;
}

export const Space: React.FC<SpaceProps> = ({
  space,
  towerStack,
  wizardsOnGround,
  wizardOnTop,
  onWizardClick,
  onTowerClick,
  onSpaceClick,
}) => {
  return (
    <div className="space" data-space-index={space.index} onClick={() => onSpaceClick?.(space.index)}>
      <div className="tower-stack">
        {wizardOnTop && <WizardComponent wizard={wizardOnTop} onWizardClick={onWizardClick} />}
        {towerStack.map(tower => (
          <TowerComponent key={tower.id} tower={tower} onTowerClick={onTowerClick} />
        ))}
      </div>
      <div className="ground-wizards">
        {wizardsOnGround.map(wizard => (
          <WizardComponent key={wizard.id} wizard={wizard} onWizardClick={onWizardClick} />
        ))}
      </div>
      <div className="space-index">{space.index}</div>
    </div>
  );
};