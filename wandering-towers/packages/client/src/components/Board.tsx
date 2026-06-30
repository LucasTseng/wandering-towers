import type { SpaceIndex, TowerID, WizardID } from '@wt/shared';
import { VISUAL_3D } from '../game/visual3d';
import type { SpaceCellData } from './Space';
import { SpaceCell } from './Space';

interface BoardProps {
  cells: SpaceCellData[];
  targetSpaces?: Set<SpaceIndex> | undefined;
  selectableSpaces?: Set<SpaceIndex> | undefined;
  sliceStart?: { spaceIndex: SpaceIndex; towerId: TowerID } | null | undefined;
  highlightWizards?: Set<WizardID> | undefined;
  onSpaceClick?: ((spaceIndex: SpaceIndex) => void) | undefined;
  onWizardClick?: ((wizardId: WizardID) => void) | undefined;
  onTowerClick?: ((spaceIndex: SpaceIndex, towerId: TowerID) => void) | undefined;
}

export function Board({
  cells,
  targetSpaces,
  selectableSpaces,
  sliceStart,
  highlightWizards,
  onSpaceClick,
  onWizardClick,
  onTowerClick,
}: BoardProps) {
  const size = cells.length;
  const center = VISUAL_3D.worldSize / 2;

  const spacePoints = cells.map((cell, i) => {
    const angle = (i / size) * 2 * Math.PI - Math.PI / 2;
    return {
      cell,
      x: VISUAL_3D.tileRingRadius * Math.cos(angle),
      y: VISUAL_3D.tileRingRadius * Math.sin(angle),
      angle,
    };
  });

  return (
    <div
      style={{
        position: 'relative',
        width: VISUAL_3D.worldSize,
        height: VISUAL_3D.worldSize,
        transformStyle: 'preserve-3d',
      }}
    >
      <div
        style={{
          position: 'absolute',
          left: center - VISUAL_3D.boardRadius,
          top: center - VISUAL_3D.boardRadius,
          width: VISUAL_3D.boardRadius * 2,
          height: VISUAL_3D.boardRadius * 2,
          borderRadius: '50%',
          background: 'radial-gradient(circle at 42% 34%, #89966c 0%, #738058 45%, #596442 100%)',
          boxShadow:
            'inset 0 0 42px rgba(25,30,20,0.35), 0 18px 0 #465132, 0 24px 24px rgba(0,0,0,0.35)',
          transform: `translateZ(${VISUAL_3D.boardHeight}px)`,
          zIndex: 0,
        }}
      />
      <div
        style={{
          position: 'absolute',
          left: center - VISUAL_3D.boardRadius,
          top: center - VISUAL_3D.boardRimDepth / 2,
          width: VISUAL_3D.boardRadius * 2,
          height: VISUAL_3D.boardRimDepth,
          borderRadius: VISUAL_3D.boardRimDepth,
          background: 'linear-gradient(180deg, #5e6b44 0%, #3f4a2c 100%)',
          boxShadow: '0 8px 18px rgba(0,0,0,0.35)',
          transform: `translateZ(${VISUAL_3D.boardHeight / 2}px)`,
          zIndex: 0,
        }}
      />

      {spacePoints.map(({ cell, x, y, angle }) => {
        const sliceIndex =
          sliceStart && sliceStart.spaceIndex === cell.spaceIndex
            ? cell.towerLayers.findIndex((layer) => layer.towerId === sliceStart.towerId)
            : -1;
        const enriched: SpaceCellData = {
          ...cell,
          highlight: targetSpaces?.has(cell.spaceIndex)
            ? 'target'
            : selectableSpaces?.has(cell.spaceIndex)
              ? 'selectable'
              : undefined,
          onSpaceClick: onSpaceClick ? () => onSpaceClick(cell.spaceIndex) : undefined,
          onWizardClick,
          highlightWizards,
          towerLayers: cell.towerLayers.map((layer, layerIdx) => {
            const isSliceStart =
              sliceStart && sliceStart.spaceIndex === cell.spaceIndex && sliceStart.towerId === layer.towerId;
            const inSlice = sliceIndex >= 0 && layerIdx >= sliceIndex;
            return {
              ...layer,
              tier: layerIdx,
              selectableStart: isSliceStart ?? false,
              inSlice,
              onTowerClick: onTowerClick ? () => onTowerClick(cell.spaceIndex, layer.towerId) : undefined,
            };
          }),
        };

        return (
          <div
            key={cell.spaceIndex}
            style={{
              position: 'absolute',
              left: center + x - VISUAL_3D.tileRadius,
              top: center + y - VISUAL_3D.tileRadius,
              width: VISUAL_3D.tileRadius * 2,
              height: VISUAL_3D.tileRadius * 2,
              transformStyle: 'preserve-3d',
              zIndex: Math.round(y + 500),
            }}
          >
            <SpaceCell data={enriched} angle={angle} />
          </div>
        );
      })}
    </div>
  );
}
