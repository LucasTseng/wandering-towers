import type { CSSProperties } from 'react';
import { VISUAL_3D } from '../game/visual3d';

/**
 * 乌鸦堡：造型与普通塔一致（八边形柱体 + 锥顶），颜色为深蓝灰系，
 * 并带乌鸦纹章。可站在地面或被标记的塔顶，因此形状必须像塔。
 */
export function Castle3D() {
  const size = VISUAL_3D.castleSize;
  const height = VISUAL_3D.castleHeight;
  const radius = size / 2;

  // 八边形顶点（与 Tower3D 一致：startAngle = π/8）
  const octagonPoints = Array.from({ length: 8 }, (_, index) => {
    const angle = Math.PI / 8 + (index / 8) * Math.PI * 2;
    return { x: Math.cos(angle) * radius, y: Math.sin(angle) * radius };
  });

  const roofHeight = height * 0.42;
  const bodyHeight = height - roofHeight;
  const body = '#33364a';
  const sideA = '#3a3d54';
  const sideB = '#252839';

  return (
    <div
      title="Raven castle"
      style={{
        position: 'relative',
        width: size,
        height: size,
        transformStyle: 'preserve-3d',
      }}
    >
      {/* 八边形侧面墙 */}
      {octagonPoints.map((point, index) => {
        const next = octagonPoints[(index + 1) % octagonPoints.length]!;
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
              height: bodyHeight,
              marginLeft: -(edge + 1) / 2,
              marginTop: -bodyHeight / 2,
              background: `linear-gradient(180deg, ${index % 2 === 0 ? sideA : body} 0%, ${
                index % 2 === 0 ? sideB : sideA
              } 100%)`,
              transform: `translate3d(${midX}px, ${midY}px, ${bodyHeight / 2}px) rotateZ(${angle}rad) rotateX(90deg)`,
            }}
          />
        );
      })}

      {/* 顶面八边形平台 */}
      <div
        style={{
          position: 'absolute',
          left: '50%',
          top: '50%',
          width: size,
          height: size,
          marginLeft: -size / 2,
          marginTop: -size / 2,
          clipPath:
            'polygon(30% 0%, 70% 0%, 100% 30%, 100% 70%, 70% 100%, 30% 100%, 0% 70%, 0% 30%)',
          background: 'linear-gradient(135deg, #4a4d66 0%, #34384c 62%, #252839 100%)',
          boxShadow: 'inset 0 2px 0 rgba(255,255,255,0.18)',
          transform: `translateZ(${bodyHeight}px)`,
        }}
      />

      {/* 锥顶（乌鸦堡屋顶） */}
      <div
        style={{
          position: 'absolute',
          left: '50%',
          top: '50%',
          width: size * 0.92,
          height: roofHeight,
          marginLeft: -(size * 0.92) / 2,
          marginTop: -roofHeight,
          background: 'linear-gradient(180deg, #4a4d66 0%, #2a2d40 100%)',
          clipPath: 'polygon(50% 0%, 0% 100%, 100% 100%)',
          transform: `translateZ(${bodyHeight + roofHeight}px) rotateX(90deg)`,
          transformOrigin: '50% 100%',
        }}
      />

      {/* 乌鸦纹章（顶面中央） */}
      <div
        style={{
          position: 'absolute',
          left: '50%',
          top: '50%',
          width: 16,
          height: 13,
          marginLeft: -8,
          marginTop: -6,
          background: '#111423',
          clipPath: 'polygon(50% 0%, 0% 100%, 100% 100%)',
          opacity: 0.92,
          transform: `translateZ(${bodyHeight + 1}px)`,
        }}
      />
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
