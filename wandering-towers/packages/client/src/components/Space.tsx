import type { TowerID, WizardID } from '@wt/shared';
import { TowerBlock } from './Tower';
import { WizardPiece } from './Wizard';

export interface TowerLayerData {
  towerId: TowerID;
  hasRavenShield: boolean;
  hasCastle: boolean;
  imprisonedWizardIds: WizardID[];
  /** 该层是否为当前可选切片起点 */
  selectableStart?: boolean | undefined;
  /** 该层是否在已选切片内 */
  inSlice?: boolean | undefined;
  onTowerClick?: (() => void) | undefined;
}

export interface SpaceCellData {
  spaceIndex: number;
  isRavenShieldGround: boolean;
  castleHere: boolean;
  towerLayers: TowerLayerData[];
  groundWizards: { wizardId: WizardID; ownerPlayerId: string }[];
  topWizards: { wizardId: WizardID; ownerPlayerId: string }[];
  /** 合法目标高亮 */
  highlight?: 'target' | 'selectable' | undefined;
  onSpaceClick?: (() => void) | undefined;
  onWizardClick?: ((wizardId: WizardID) => void) | undefined;
}

/** 单个空间格（环形棋盘的一格） */
export function SpaceCell({ data }: { data: SpaceCellData }) {
  return (
    <div
      className="space-cell"
      onClick={data.onSpaceClick}
      style={{
        width: 80,
        height: 80,
        border: data.highlight === 'target'
          ? '2px solid gold'
          : data.highlight === 'selectable'
            ? '2px dashed #4caf50'
            : '1px solid #888',
        borderRadius: 6,
        background: data.castleHere ? '#fff3cd' : data.isRavenShieldGround ? '#e8eaf6' : '#f5f5f5',
        position: 'relative',
        cursor: data.onSpaceClick ? 'pointer' : 'default',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'flex-end',
        padding: 2,
        boxSizing: 'border-box',
      }}
      title={`空间 ${data.spaceIndex}${data.isRavenShieldGround ? '（乌鸦纹章位）' : ''}`}
    >
      {/* 塔堆：自下而上渲染，视觉上底层在下 */}
      <div style={{ display: 'flex', flexDirection: 'column-reverse', alignItems: 'center' }}>
        {data.towerLayers.map((layer) => (
          <div key={layer.towerId} style={{ position: 'relative' }}>
            <TowerBlock
              towerId={layer.towerId}
              hasRavenShield={layer.hasRavenShield}
              hasCastle={layer.hasCastle}
              selectable={layer.selectableStart}
              inSlice={layer.inSlice}
              onClick={layer.onTowerClick}
            />
            {/* 塔顶巫师：只在最顶层显示 */}
            {/* 封印巫师标记（开发模式：直显） */}
            {layer.imprisonedWizardIds.length > 0 && (
              <div
                style={{
                  position: 'absolute',
                  right: -4,
                  top: -6,
                  background: '#444',
                  color: '#fff',
                  borderRadius: 8,
                  fontSize: 8,
                  padding: '0 3px',
                }}
                title={`封印: ${layer.imprisonedWizardIds.join(', ')}`}
              >
                {layer.imprisonedWizardIds.length}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* 塔顶巫师（站在最顶塔上） */}
      <div style={{ display: 'flex', gap: 1, marginBottom: 1 }}>
        {data.topWizards.map((w) => (
          <WizardPiece
            key={w.wizardId}
            wizardId={w.wizardId}
            ownerPlayerId={w.ownerPlayerId}
            onClick={data.onWizardClick ? () => data.onWizardClick!(w.wizardId) : undefined}
          />
        ))}
      </div>

      {/* 地面巫师 */}
      <div style={{ display: 'flex', gap: 1, marginBottom: 1 }}>
        {data.groundWizards.map((w) => (
          <WizardPiece
            key={w.wizardId}
            wizardId={w.wizardId}
            ownerPlayerId={w.ownerPlayerId}
            onClick={data.onWizardClick ? () => data.onWizardClick!(w.wizardId) : undefined}
          />
        ))}
      </div>

      <span style={{ fontSize: 9, color: '#666' }}>{data.spaceIndex}</span>
    </div>
  );
}
