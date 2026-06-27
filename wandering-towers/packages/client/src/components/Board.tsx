import type { SpaceIndex, TowerID, WizardID } from '@wt/shared';
import type { SpaceCellData } from './Space';
import { SpaceCell } from './Space';

interface BoardProps {
  cells: SpaceCellData[];
  /** 合法目标空间集合（高亮） */
  targetSpaces?: Set<SpaceIndex> | undefined;
  /** 可选空间集合 */
  selectableSpaces?: Set<SpaceIndex> | undefined;
  /** 选中的塔切片起点 {spaceIndex: towerId} */
  sliceStart?: { spaceIndex: SpaceIndex; towerId: TowerID } | null | undefined;
  onSpaceClick?: ((spaceIndex: SpaceIndex) => void) | undefined;
  onWizardClick?: ((wizardId: WizardID) => void) | undefined;
  onTowerClick?: ((spaceIndex: SpaceIndex, towerId: TowerID) => void) | undefined;
}

/** 环形棋盘（16 空间顺时针排列） */
export function Board({
  cells,
  targetSpaces,
  selectableSpaces,
  sliceStart,
  onSpaceClick,
  onWizardClick,
  onTowerClick,
}: BoardProps) {
  const radius = 200;
  const size = cells.length;

  return (
    <div style={{ position: 'relative', width: radius * 2 + 80, height: radius * 2 + 80, margin: '0 auto' }}>
      {cells.map((cell, i) => {
        const angle = (i / size) * 2 * Math.PI - Math.PI / 2;
        const x = radius + 50 + radius * Math.cos(angle) - 40;
        const y = radius + 50 + radius * Math.sin(angle) - 40;

        // 计算每层是否在选中切片内
        const enriched: SpaceCellData = {
          ...cell,
          highlight: targetSpaces?.has(cell.spaceIndex)
            ? 'target'
            : selectableSpaces?.has(cell.spaceIndex)
              ? 'selectable'
              : undefined,
          onSpaceClick: onSpaceClick ? () => onSpaceClick(cell.spaceIndex) : undefined,
          onWizardClick,
          towerLayers: cell.towerLayers.map((layer, layerIdx) => {
            const isSliceStart =
              sliceStart && sliceStart.spaceIndex === cell.spaceIndex && sliceStart.towerId === layer.towerId;
            const inSlice =
              sliceStart && sliceStart.spaceIndex === cell.spaceIndex && layerIdx >= cell.towerLayers.findIndex(
                (l) => l.towerId === sliceStart.towerId,
              );
            return {
              ...layer,
              selectableStart: isSliceStart ?? false,
              inSlice: inSlice ?? false,
              onTowerClick: onTowerClick
                ? () => onTowerClick(cell.spaceIndex, layer.towerId)
                : undefined,
            };
          }),
        };

        return (
          <div key={cell.spaceIndex} style={{ position: 'absolute', left: x, top: y }}>
            <SpaceCell data={enriched} />
          </div>
        );
      })}
    </div>
  );
}
