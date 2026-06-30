import type { CSSProperties } from 'react';
import type { TowerID } from '@wt/shared';
import { VISUAL_3D } from '../game/visual3d';

interface Tower3DProps {
  towerId: TowerID;
  hasRavenShield: boolean;
  selectable?: boolean | undefined;
  inSlice?: boolean | undefined;
  onClick?: (() => void) | undefined;
  tier?: number | undefined;
}

const OCTAGON_POINTS = Array.from({ length: 8 }, (_, index) => {
  const angle = Math.PI / 8 + (index / 8) * Math.PI * 2;
  const radius = VISUAL_3D.towerBaseWidth / 2;
  return {
    x: Math.cos(angle) * radius,
    y: Math.sin(angle) * radius,
  };
});

export function Tower3D({ towerId, hasRavenShield, selectable, inSlice, onClick, tier = 0 }: Tower3DProps) {
  const lit = selectable || inSlice;
  const body = '#667565';
  const top = '#87947e';
  const sideA = '#536350';
  const sideB = '#465742';
  const brightness = 1 + Math.min(0.12, tier * 0.025);
  const clip = 'polygon(30% 0%, 70% 0%, 100% 30%, 100% 70%, 70% 100%, 30% 100%, 0% 70%, 0% 30%)';

  return (
    <div
      title={`${towerId}${hasRavenShield ? ' raven mark' : ''}`}
      style={{
        position: 'relative',
        width: VISUAL_3D.towerBaseWidth,
        height: VISUAL_3D.towerBaseWidth,
        transformStyle: 'preserve-3d',
        transform: lit ? `translateZ(${VISUAL_3D.towerSideDepth}px)` : undefined,
        transition: 'transform 150ms ease',
      }}
    >
      {OCTAGON_POINTS.map((point, index) => {
        const next = OCTAGON_POINTS[(index + 1) % OCTAGON_POINTS.length]!;
        const midX = (point.x + next.x) / 2;
        const midY = (point.y + next.y) / 2;
        const edge = Math.hypot(next.x - point.x, next.y - point.y);
        const angle = Math.atan2(next.y - point.y, next.x - point.x);
        return (
          <div
            key={index}
            style={{
              ...sideStyle,
              width: edge + 1,
              height: VISUAL_3D.towerLayerHeight,
              marginLeft: -(edge + 1) / 2,
              marginTop: -VISUAL_3D.towerLayerHeight / 2,
              background: `linear-gradient(180deg, ${index % 2 === 0 ? sideA : body} 0%, ${
                index % 2 === 0 ? sideB : sideA
              } 100%)`,
              filter: `brightness(${brightness})`,
              transform: `translate3d(${midX}px, ${midY}px, ${
                VISUAL_3D.towerLayerHeight / 2
              }px) rotateZ(${angle}rad) rotateX(90deg)`,
            }}
          />
        );
      })}

      <button
        onClick={onClick}
        data-interactive={onClick ? '' : undefined}
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          width: VISUAL_3D.towerBaseWidth,
          height: VISUAL_3D.towerBaseWidth,
          border: lit && inSlice ? '2px solid gold' : '1px solid rgba(35,43,30,0.4)',
          padding: 0,
          clipPath: clip,
          cursor: onClick ? 'pointer' : 'default',
          background: `linear-gradient(135deg, ${top} 0%, ${body} 62%, ${sideA} 100%)`,
          boxShadow: lit
            ? '0 0 12px rgba(255,215,0,0.8), inset 0 2px 0 rgba(255,255,255,0.22)'
            : 'inset 0 2px 0 rgba(255,255,255,0.2)',
          color: '#f5e9c8',
          fontSize: 9,
          fontWeight: 700,
          textShadow: '0 1px 1px #000',
          filter: `brightness(${brightness})`,
          transform: `translateZ(${VISUAL_3D.towerLayerHeight}px)`,
        }}
      >
        {towerId}
      </button>

      {Array.from({ length: 8 }, (_, index) => {
        const angle = Math.PI / 8 + (index / 8) * Math.PI * 2;
        return (
          <div
            key={index}
            style={{
              position: 'absolute',
              left: '50%',
              top: '50%',
              width: 9,
              height: 9,
              marginLeft: -4.5,
              marginTop: -4.5,
              background: top,
              border: '1px solid rgba(0,0,0,0.22)',
              boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.18)',
              transform: `translate3d(${Math.cos(angle) * 25}px, ${Math.sin(angle) * 25}px, ${
                VISUAL_3D.towerLayerHeight + 5
              }px)`,
            }}
          />
        );
      })}

      {hasRavenShield && (
        <div
          style={{
            position: 'absolute',
            left: '50%',
            top: '50%',
            width: 18,
            height: 18,
            marginLeft: -9,
            marginTop: -9,
            borderRadius: 3,
            background: 'linear-gradient(135deg, #8bc6ff 0%, #24538b 100%)',
            boxShadow: '0 0 8px rgba(127,179,255,0.9), inset 0 1px 0 rgba(255,255,255,0.45)',
            clipPath: 'polygon(50% 100%, 4% 62%, 4% 8%, 96% 8%, 96% 62%)',
            transform: `translateZ(${VISUAL_3D.towerLayerHeight + 6}px)`,
          }}
        />
      )}
    </div>
  );
}

const sideStyle: CSSProperties = {
  position: 'absolute',
  left: '50%',
  top: '50%',
  transformOrigin: 'center center',
  backfaceVisibility: 'hidden',
  boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.08), inset 0 -2px 0 rgba(0,0,0,0.2)',
};
