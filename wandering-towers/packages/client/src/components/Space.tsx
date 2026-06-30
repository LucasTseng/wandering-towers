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
  const tileSideCount = Math.abs(data.spaceIndex % 2) === 0 ? 6 : 8;
  const tileClip =
    tileSideCount === 6
      ? 'polygon(50% 0%, 93% 25%, 93% 75%, 50% 100%, 7% 75%, 7% 25%)'
      : 'polygon(30% 0%, 70% 0%, 100% 30%, 100% 70%, 70% 100%, 30% 100%, 0% 70%, 0% 30%)';
  const tilePoints = polygonPoints(tileSideCount, VISUAL_3D.tileRadius * 0.92, tileSideCount === 6 ? -Math.PI / 2 : Math.PI / 8);

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
          transform: `translateZ(${tileSurfaceZ}px) rotateZ(${angle + Math.PI / 2}rad)`,
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

      {data.isRavenShieldPosition && (
        <div
          style={{
            position: 'absolute',
            left: VISUAL_3D.tileRadius - 8,
            top: VISUAL_3D.tileRadius - 22,
            width: 16,
            height: 18,
            border: '1px solid rgba(190, 220, 255, 0.9)',
            borderRadius: '8px 8px 10px 10px',
            background: 'linear-gradient(180deg, rgba(127,179,255,0.9), rgba(34,77,130,0.82))',
            boxShadow: '0 0 9px rgba(127,179,255,0.75)',
            clipPath: 'polygon(50% 100%, 5% 66%, 5% 8%, 95% 8%, 95% 66%)',
            transform: `translateZ(${tileSurfaceZ + 3}px)`,
            zIndex: 2,
          }}
        />
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
