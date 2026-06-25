import React from 'react';
import type { Tower } from '../../../../shared/src/types';

interface TowerProps {
  tower: Tower;
  onTowerClick?: (towerId: string) => void;
}

export const TowerComponent: React.FC<TowerProps> = ({ tower, onTowerClick }) => {
  const className = `tower ${tower.isRavenTower ? 'raven-tower' : ''}`;
  const style = { backgroundColor: tower.isRavenTower ? '#222' : tower.color };

  const handleClick = (e: React.MouseEvent) => {
    if (onTowerClick) {
      e.stopPropagation();
      onTowerClick(tower.id);
    }
  };

  return <div className={className} style={style} onClick={handleClick} />;
};