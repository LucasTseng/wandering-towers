import type { CSSProperties } from 'react';
import type { PlayerID, TowerID, WizardID } from '@wt/shared';
import { tileSurfaceZ, towerStackHeight, VISUAL_3D } from '../game/visual3d';
import { Tower3D } from './Tower3D';
import { Wizard3D } from './Wizard3D';
import { Castle3D } from './Castle3D';

export interface TowerLayerData {
  towerId: TowerID;
  hasRavenShield: boolean;
  hasCastle: boolean;
  imprisonedWizards: number;
  tier?: number | undefined;
  selectableStart?: boolean | undefined;
  inSlice?: boolean | undefined;
  onTowerClick?: (() => void) | undefined;
}

export interface SpaceCellData {
  spaceIndex: number;
  isRavenShieldGround: boolean;
  isRavenShieldPosition: boolean;
  setupCapacity: number;
  castleHere: boolean;
  castleOnTowerId: TowerID | null;
  towerLayers: TowerLayerData[];
  groundWizards: { wizardId: WizardID; ownerPlayerId: string }[];
  topWizards: { wizardId: WizardID; ownerPlayerId: string }[];
  highlight?: 'target' | 'selectable' | undefined;
  onSpaceClick?: (() => void) | undefined;
  onWizardClick?: ((wizardId: WizardID) => void) | undefined;
  selectableWizardOwnerId?: PlayerID | undefined;
  highlightWizards?: Set<WizardID> | undefined;
}

export function SpaceCell({ data, angle }: { data: SpaceCellData; angle: number }) {
  const stackHeight = towerStackHeight(data.towerLayers.length);
  const topSurfaceZ = tileSurfaceZ + stackHeight;
  const topWizardZ = topSurfaceZ + VISUAL_3D.wizardHeight;
  const groundWizardZ = tileSurfaceZ + VISUAL_3D.wizardHeight;
  // 16 边形 tile：边法线间隔 22.5°(π/8) 与 16 环邻居圆心夹角一致，
  // 不旋转顶面时 edge i 自然朝向 neighbor i+1，边边可贴边对齐。
  // 半径取 0.92*tileRadius ≈ 68 ≈ R·tan(π/16)，使 flat-to-flat = 邻居弦长，贴边无重叠。
  // 顶面 clip 与侧面墙共用同一组 polygonPoints，杜绝顶面/侧面错位。
  const tileSideCount = 16;
  const tilePoints = polygonPoints(tileSideCount, VISUAL_3D.tileRadius * 0.92, 0);
  const tileClip = `polygon(${tilePoints
    .map(
      (p) =>
        `${((p.x + VISUAL_3D.tileRadius) / (VISUAL_3D.tileRadius * 2)) * 100}% ${((p.y + VISUAL_3D.tileRadius) / (VISUAL_3D.tileRadius * 2)) * 100}%`,
    )
    .join(', ')})`;

  return (
    <div
      style={{
        position: 'relative',
        width: VISUAL_3D.tileRadius * 2,
        height: VISUAL_3D.tileRadius * 2,
        transformStyle: 'preserve-3d',
      }}
    >
      <div
        className="space-cell"
        onClick={data.onSpaceClick}
        data-interactive={data.onSpaceClick ? '' : undefined}
        title={`Space ${data.spaceIndex}`}
        style={{
          ...tileFaceStyle(tileClip, data),
          transform: `translateZ(${tileSurfaceZ}px)`,
          cursor: data.onSpaceClick ? 'pointer' : 'default',
          zIndex: 1,
        }}
      />
      {tilePoints.map((point, index) => {
        const next = tilePoints[(index + 1) % tilePoints.length]!;
        const edge = Math.hypot(next.x - point.x, next.y - point.y);
        const midX = (point.x + next.x) / 2;
        const midY = (point.y + next.y) / 2;
        const sideAngle = Math.atan2(next.y - point.y, next.x - point.x);
        return (
          <div
            key={index}
            style={{
              position: 'absolute',
              left: '50%',
              top: '50%',
              width: edge + 1,
              height: VISUAL_3D.tileHeight,
              marginLeft: -(edge + 1) / 2,
              marginTop: -VISUAL_3D.tileHeight / 2,
              background: data.isRavenShieldGround
                ? index % 2 === 0
                  ? '#25384d'
                  : '#1b2a3b'
                : index % 2 === 0
                  ? '#b88e55'
                  : '#9b7747',
              boxShadow: 'inset 0 -2px 0 rgba(0,0,0,0.18)',
              transformOrigin: 'center center',
              transform: `translate3d(${midX}px, ${midY}px, ${
                VISUAL_3D.boardHeight + VISUAL_3D.tileHeight / 2
              }px) rotateZ(${sideAngle}rad) rotateX(90deg)`,
              zIndex: 0,
            }}
          />
        );
      })}

      {data.isRavenShieldGround && data.towerLayers.length === 0 && (
        <div
          title="乌鸦纹章地面位（乌鸦城堡可落点）"
          style={{
            position: 'absolute',
            left: 26,
            top: 26,
            width: 18,
            height: 18,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'radial-gradient(circle at 50% 40%, rgba(127,179,255,0.95), rgba(34,77,130,0.9))',
            border: '1px solid rgba(190,220,255,0.95)',
            borderRadius: '50%',
            boxShadow: '0 0 8px rgba(127,179,255,0.85)',
            // 放在 tile 表面内、16 边形顶面左上角内（内切半径 ~66，left/top 26 落在面内，
            // 不再像 left/top 4 那样落在方形角隙「地图外」）。
            // 仅在「地面纹章位且无塔遮挡」时显示：一旦该格被塔压住，地面纹章被塔体盖住不可见，
            // 由塔顶纹章接管显示。
            transform: `translateZ(${tileSurfaceZ + 3}px)`,
            zIndex: 30,
          }}
        >
          {/* 乌鸦剪影（与 Tower3D 顶部纹章同款三角形） */}
          <div
            style={{
              width: 10,
              height: 7,
              background: '#0b1220',
              clipPath: 'polygon(50% 0%, 0% 100%, 100% 100%)',
              opacity: 0.95,
            }}
          />
        </div>
      )}

      {data.setupCapacity > 0 && (
        <div
          title={`开局容量 ${data.setupCapacity} 名巫师`}
          style={{
            position: 'absolute',
            right: 26,
            bottom: 26,
            display: 'flex',
            alignItems: 'center',
            gap: 2,
            padding: '1px 4px',
            borderRadius: 8,
            background: 'rgba(40,20,10,0.62)',
            border: '1px solid rgba(255,140,40,0.7)',
            fontSize: 10,
            fontWeight: 700,
            color: '#ffd9a0',
            textShadow: '0 1px 1px #000',
            // 放在 tile 表面内、16 边形顶面右下角内（内切半径 ~66，right/bottom 26 落在面内，
            // 不再像 right/bottom 3 那样落在方形角隙「地图外」）。
            transform: `translateZ(${tileSurfaceZ + 3}px)`,
            zIndex: 30,
          }}
        >
          <span style={{ fontSize: 11, lineHeight: '10px' }}>🔥</span>
          <span>{data.setupCapacity}</span>
        </div>
      )}

      {data.groundWizards.length > 0 && (
        <WizardCluster
          wizards={data.groundWizards}
          z={groundWizardZ}
          radius={26}
          data={data}
        />
      )}

      {data.towerLayers.map((layer, index) => (
        <div
          key={layer.towerId}
          style={{
            position: 'absolute',
            left: '50%',
            top: '50%',
            width: VISUAL_3D.towerBaseWidth,
            height: VISUAL_3D.towerBaseWidth,
            marginLeft: -VISUAL_3D.towerBaseWidth / 2,
            marginTop: -VISUAL_3D.towerBaseWidth / 2,
            transformStyle: 'preserve-3d',
            transform: `translateZ(${tileSurfaceZ + index * VISUAL_3D.towerLayerHeight}px)`,
            zIndex: 4 + index,
          }}
        >
          <Tower3D
            towerId={layer.towerId}
            hasRavenShield={layer.hasRavenShield}
            selectable={layer.selectableStart}
            inSlice={layer.inSlice}
            onClick={layer.onTowerClick}
            tier={layer.tier}
          />
        </div>
      ))}

      {data.topWizards.length > 0 && (
        <WizardCluster
          wizards={data.topWizards}
          z={topWizardZ}
          radius={24}
          data={data}
        />
      )}

      {data.castleHere && (
        <CastleMount z={tileSurfaceZ} />
      )}

      {data.castleOnTowerId && (
        <CastleMount z={topSurfaceZ} />
      )}

      <div
        style={{
          position: 'absolute',
          left: '50%',
          top: '50%',
          width: 22,
          marginLeft: -11,
          marginTop: -8,
          fontSize: 9,
          lineHeight: '14px',
          textAlign: 'center',
          color: '#f5e9c8',
          background: 'rgba(0,0,0,0.42)',
          borderRadius: 3,
          transform: `translateZ(${tileSurfaceZ + 5}px)`,
          zIndex: 9,
        }}
      >
        {data.spaceIndex}
      </div>
    </div>
  );
}

function tileFaceStyle(tileClip: string, data: SpaceCellData): CSSProperties {
  const border =
    data.highlight === 'target' ? '3px solid gold' : data.highlight === 'selectable' ? '2px dashed #6bd873' : 'none';
  return {
    position: 'absolute',
    inset: 0,
    clipPath: tileClip,
    background: data.isRavenShieldGround
      ? 'linear-gradient(135deg, #44546a 0%, #25384d 58%, #1b2a3b 100%)'
      : 'linear-gradient(135deg, #ead091 0%, #c9a56e 58%, #9b7747 100%)',
    border,
    boxShadow: data.highlight
      ? '0 0 14px rgba(255,215,0,0.82), inset 0 2px 0 rgba(255,255,255,0.22)'
      : '0 5px 10px rgba(0,0,0,0.25), inset 0 2px 0 rgba(255,255,255,0.22)',
  };
}

function polygonPoints(count: number, radius: number, startAngle: number) {
  return Array.from({ length: count }, (_, index) => {
    const angle = startAngle + (index / count) * Math.PI * 2;
    return {
      x: Math.cos(angle) * radius,
      y: Math.sin(angle) * radius,
    };
  });
}

function WizardCluster({
  wizards,
  z,
  radius,
  data,
}: {
  wizards: { wizardId: WizardID; ownerPlayerId: string }[];
  z: number;
  radius: number;
  data: SpaceCellData;
}) {
  return (
    <>
      {wizards.slice(0, 6).map((wizard, index) => {
        const point = wizardPoint(index, radius);
        const clickable =
          data.onWizardClick &&
          (data.selectableWizardOwnerId === undefined || wizard.ownerPlayerId === data.selectableWizardOwnerId);
        return (
          <div
            key={wizard.wizardId}
            style={{
              position: 'absolute',
              left: '50%',
              top: '50%',
              marginLeft: -VISUAL_3D.wizardRadius,
              marginTop: -VISUAL_3D.wizardRadius,
              transformStyle: 'preserve-3d',
              transform: `translate3d(${point.x}px, ${point.y}px, ${z}px) rotateX(-90deg)`,
              zIndex: 12 + index,
              pointerEvents: 'auto',
            }}
          >
            <Wizard3D
              wizardId={wizard.wizardId}
              ownerPlayerId={wizard.ownerPlayerId}
              highlight={data.highlightWizards?.has(wizard.wizardId)}
              dimmed={!!data.onWizardClick && !clickable}
              onClick={clickable ? () => data.onWizardClick!(wizard.wizardId) : undefined}
            />
          </div>
        );
      })}
    </>
  );
}

function CastleMount({ z }: { z: number }) {
  return (
    <div
      style={{
        position: 'absolute',
        left: '50%',
        top: '50%',
        width: VISUAL_3D.castleSize,
        height: VISUAL_3D.castleSize,
        marginLeft: -VISUAL_3D.castleSize / 2,
        marginTop: -VISUAL_3D.castleSize / 2,
        transformStyle: 'preserve-3d',
        transform: `translateZ(${z}px)`,
        zIndex: 20,
      }}
    >
      <Castle3D />
    </div>
  );
}

function wizardPoint(index: number, radius: number) {
  if (index === 0) return { x: 0, y: 0 };
  const angle = ((index - 1) / 5) * Math.PI * 2 - Math.PI / 2;
  return {
    x: Math.cos(angle) * radius,
    y: Math.sin(angle) * radius,
  };
}
