import type { PlayerID, TowerID, WizardID } from '@wt/shared';
import { TowerBlock } from './Tower';
import { WizardPiece } from './Wizard';

export interface TowerLayerData {
  towerId: TowerID;
  hasRavenShield: boolean;
  hasCastle: boolean;
  imprisonedWizards: number;
  /** 该层是否为当前可选切片起点 */
  selectableStart?: boolean | undefined;
  /** 该层是否在已选切片内 */
  inSlice?: boolean | undefined;
  onTowerClick?: (() => void) | undefined;
}

export interface SpaceCellData {
  spaceIndex: number;
  isRavenShieldGround: boolean;
  /** 城堡在该空间地面（ON_SPACE，无塔） */
  castleHere: boolean;
  /** 城堡所在塔 ID（null 表示在地面） */
  castleOnTowerId: TowerID | null;
  towerLayers: TowerLayerData[];
  groundWizards: { wizardId: WizardID; ownerPlayerId: string }[];
  topWizards: { wizardId: WizardID; ownerPlayerId: string }[];
  highlight?: 'target' | 'selectable' | undefined;
  onSpaceClick?: (() => void) | undefined;
  onWizardClick?: ((wizardId: WizardID) => void) | undefined;
  /** V2 §8.1 颜色隔离：仅当 ownerPlayerId 等于此值时巫师可被点击。undefined = 不过滤（保留旧行为） */
  selectableWizardOwnerId?: PlayerID | undefined;
}

/** 单个空间格（环形棋盘的一格）
 *
 * 渲染顺序（顶→底）：
 *  1. 顶塔的巫师（站在最顶塔之上）
 *  2. 塔堆（column-reverse：底层在下、最顶塔在最上）
 *  3. 地面巫师
 *  4. 乌鸦城堡在地面时（ON_SPACE）显示在中心
 *  5. 空间索引
 *
 * 封印巫师不显示——V2 §23.1：玩家凭记忆记录被封印的巫师，UI 不揭示。
 */
export function SpaceCell({ data }: { data: SpaceCellData }) {
  return (
    <div
      className="space-cell"
      onClick={data.onSpaceClick}
      style={{
        width: 60,
        height: 60,
        border: data.highlight === 'target'
          ? '2px solid gold'
          : data.highlight === 'selectable'
            ? '2px dashed #4caf50'
            : '1px solid #888',
        borderRadius: 4,
        background: data.castleHere ? '#fff3cd' : data.isRavenShieldGround ? '#e8eaf6' : '#f5f5f5',
        position: 'relative',
        cursor: data.onSpaceClick ? 'pointer' : 'default',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: 1,
        boxSizing: 'border-box',
      }}
      title={`空间 ${data.spaceIndex}${data.isRavenShieldGround ? '（乌鸦纹章位）' : ''}`}
    >
      {/* 顶塔的巫师（站在最顶塔之上） */}
      {data.topWizards.length > 0 && (
        <div
          style={{
            display: 'flex',
            gap: 1,
            marginBottom: -1,
            zIndex: 2,
            position: 'relative',
          }}
        >
          {data.topWizards.map((w) => (
            <WizardPiece
              key={w.wizardId}
              wizardId={w.wizardId}
              ownerPlayerId={w.ownerPlayerId}
              size={14}
              onClick={
                data.onWizardClick &&
                (data.selectableWizardOwnerId === undefined ||
                  w.ownerPlayerId === data.selectableWizardOwnerId)
                  ? () => data.onWizardClick!(w.wizardId)
                  : undefined
              }
            />
          ))}
        </div>
      )}

      {/* 塔堆：column-reverse 让底层在下、最顶塔在最上 */}
      <div style={{ display: 'flex', flexDirection: 'column-reverse', alignItems: 'center' }}>
        {data.towerLayers.map((layer) => (
          <div key={layer.towerId} style={{ position: 'relative' }}>
            <TowerBlock
              towerId={layer.towerId}
              hasRavenShield={layer.hasRavenShield}
              hasCastle={data.castleOnTowerId === layer.towerId}
              selectable={layer.selectableStart}
              inSlice={layer.inSlice}
              onClick={layer.onTowerClick}
            />
            {/* 不显示封印标记（V2 §23.1） */}
          </div>
        ))}
      </div>

      {/* 地面巫师 */}
      {data.groundWizards.length > 0 && (
        <div style={{ display: 'flex', gap: 1, marginTop: 1 }}>
          {data.groundWizards.map((w) => (
            <WizardPiece
              key={w.wizardId}
              wizardId={w.wizardId}
              ownerPlayerId={w.ownerPlayerId}
              size={14}
              onClick={
                data.onWizardClick &&
                (data.selectableWizardOwnerId === undefined ||
                  w.ownerPlayerId === data.selectableWizardOwnerId)
                  ? () => data.onWizardClick!(w.wizardId)
                  : undefined
              }
            />
          ))}
        </div>
      )}

      {/* 乌鸦城堡在地面（ON_SPACE）时显示在中心 */}
      {data.castleHere && (
        <div
          style={{
            position: 'absolute',
            left: '50%',
            top: '50%',
            transform: 'translate(-50%, -50%)',
            fontSize: 22,
            zIndex: 1,
            pointerEvents: 'none',
            opacity: 0.85,
          }}
          title="乌鸦城堡"
        >
          🏰
        </div>
      )}

      {/* 空间索引（右下角小标签） */}
      <span
        style={{
          position: 'absolute',
          right: 1,
          bottom: 0,
          fontSize: 8,
          color: '#666',
          background: 'rgba(255,255,255,0.7)',
          borderRadius: 2,
          padding: '0 1px',
        }}
      >
        {data.spaceIndex}
      </span>
    </div>
  );
}
