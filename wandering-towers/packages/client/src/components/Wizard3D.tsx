import type { WizardID } from '@wt/shared';
import { PLAYER_COLORS } from '../game/config';
import { VISUAL_3D } from '../game/visual3d';

interface Wizard3DProps {
  wizardId: WizardID;
  ownerPlayerId: string;
  highlight?: boolean | undefined;
  dimmed?: boolean | undefined;
  onClick?: (() => void) | undefined;
}

export function Wizard3D({ wizardId, ownerPlayerId, highlight, dimmed, onClick }: Wizard3DProps) {
  const color = PLAYER_COLORS[ownerPlayerId] ?? '#888';
  const owner = wizardId.match(/W_(P\d)/)?.[1] ?? ownerPlayerId;
  const bodyHeight = VISUAL_3D.wizardHeight - VISUAL_3D.wizardHeadRadius * 2;

  // 头部真球体：用一组水平纬度圆盘叠成球。所有圆盘水平、绕竖轴旋转对称，
  // 任意俯角/水平旋转下都呈球状，不会出现侧立纸片。
  const headR = VISUAL_3D.wizardHeadRadius;
  const HEAD_LATITUDES = Array.from({ length: 7 }, (_, i) => {
    const h = -3.5 + (7 / 6) * i; // [-3.5, 3.5]，覆盖球心上下
    const r = Math.sqrt(Math.max(0, headR * headR - h * h));
    return { h, r };
  });

  return (
    <div
      className={'wizard-piece' + (highlight ? ' wt-wizard-glow' : '')}
      title={`${owner} wizard`}
      onClick={onClick}
      data-interactive={onClick ? '' : undefined}
      style={{
        position: 'relative',
        width: VISUAL_3D.wizardRadius * 2,
        height: VISUAL_3D.wizardHeight,
        cursor: dimmed ? 'not-allowed' : onClick ? 'pointer' : 'default',
        filter: dimmed ? 'saturate(0.22) opacity(0.5)' : undefined,
        transformStyle: 'preserve-3d',
        transition: 'filter 120ms ease',
      }}
    >
      <div
        style={{
          position: 'absolute',
          left: -2,
          right: -2,
          bottom: -1,
          height: 4,
          borderRadius: '50%',
          background: 'radial-gradient(ellipse at 50% 50%, rgba(0,0,0,0.42) 0%, transparent 72%)',
        }}
      />

      {Array.from({ length: 4 }, (_, index) => (
        <div
          key={index}
          style={{
            position: 'absolute',
            left: '50%',
            bottom: 1,
            width: VISUAL_3D.wizardRadius * 2,
            height: bodyHeight,
            marginLeft: -VISUAL_3D.wizardRadius,
            background:
              index % 2 === 0
                ? `linear-gradient(90deg, rgba(0,0,0,0.22), ${color} 45%, rgba(255,255,255,0.2))`
                : `linear-gradient(90deg, rgba(255,255,255,0.18), ${color} 55%, rgba(0,0,0,0.24))`,
            clipPath: 'polygon(50% 0%, 0% 100%, 100% 100%)',
            transformOrigin: '50% 100%',
            transform: `rotateY(${index * 45}deg)`,
            backfaceVisibility: 'hidden',
          }}
        />
      ))}

      {/* 头部：水平纬度圆盘叠成真球体，杜绝侧立纸片 */}
      <div
        style={{
          position: 'absolute',
          left: '50%',
          top: VISUAL_3D.wizardHeadRadius + 1,
          width: 0,
          height: 0,
          transformStyle: 'preserve-3d',
          transform: `translateZ(${VISUAL_3D.wizardHeadRadius / 2}px)`,
        }}
      >
        {HEAD_LATITUDES.map((lat, i) => (
          <div
            key={i}
            style={{
              position: 'absolute',
              left: '50%',
              top: '50%',
              width: lat.r * 2,
              height: lat.r * 2,
              marginLeft: -lat.r,
              marginTop: -lat.r,
              borderRadius: '50%',
              background: 'radial-gradient(circle at 35% 30%, #ffe7c9 0%, #ffcc9d 62%, #c88661 100%)',
              transform: `translateZ(${lat.h}px)`,
            }}
          />
        ))}
      </div>
    </div>
  );
}
