import React from 'react';
import type { Wizard } from '../../../../shared/src/types';

interface WizardProps {
  wizard: Wizard;
  onWizardClick?: (wizardId: string) => void;
}

export const WizardComponent: React.FC<WizardProps> = ({ wizard, onWizardClick }) => {
  // In a real app, player colors would come from a config or theme
  const playerColors: { [key: string]: string } = { P1: 'royalblue', P2: 'crimson', P3: 'goldenrod', P4: 'forestgreen' };

  const handleClick = (e: React.MouseEvent) => {
    if (onWizardClick) {
      e.stopPropagation();
      onWizardClick(wizard.id);
    }
  };

  return <div className="wizard" style={{ backgroundColor: playerColors[wizard.ownerPlayerId] }} onClick={handleClick} />;
};