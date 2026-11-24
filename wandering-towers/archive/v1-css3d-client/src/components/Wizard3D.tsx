import type { CSSProperties } from 'react';
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

/**
 * B01 / B02 —— 与 3D-asset-stage.html 的 wizard() 同源：
 * 外层 rotateX(-90deg) 立起，4 片 rotateY 袍身 + 4 片帽锥 + 水平帽檐。
 *
 * v2 修正：dimmed 的降饱和 / 半透明只施加在叶子面上。
 * 外层是 preserve-3d 容器，加 filter 或 opacity<1 会把 4 片交叉体压平。
 */
export function Wizard3D({ wizardId, ownerPlayerId, highlight, dimmed, onClick }: Wizard3DProps) {
  const color = PLAYER_COLORS[ownerPlayerId] ?? '#888';
  const owner = wizardId.match(/W_(P\d)/)?.[1] ?? ownerPlayerId;
  const width = VISUAL_3D.wizardRadius * 2;
  const height = VISUAL_3D.wizardHeight;
  const hatHeight = height * 0.4;
  const robeHeight = height - hatHeight;
  const leafFilter: CSSProperties['filter'] = dimmed ? 'saturate(0.22) opacity(0.5)' : undefined;
  const vars = ({ '--robe': color, '--hat': color } as CSSProperties);

  return (
    <div
      className={'wizard-piece' + (highlight ? ' va-wizard-highlight' : '')}
      title={`${owner} wizard`}
      onClick={onClick}
      data-interactive={onClick ? '' : undefined}
      style={{
        position: 'relative',
        width,
        height,
        cursor: dimmed ? 'not-allowed' : onClick ? 'pointer' : 'default',
        transformStyle: 'preserve-3d',
        transition: 'filter 120ms ease',
        ...vars,
      }}
    >
      {/* 底部软投影 + B02 金环（叶子） */}
      <div
        style={{
          position: 'absolute',
          left: -3,
          right: -3,
          bottom: -2,
          height: 6,
          borderRadius: '50%',
          background: highlight
            ? 'radial-gradient(ellipse at 50% 50%, rgba(232,179,57,0.55) 0%, transparent 72%)'
            : 'radial-gradient(ellipse at 50% 50%, rgba(0,0,0,0.45) 0%, transparent 72%)',
          border: highlight ? '1px solid rgba(232,179,57,0.85)' : undefined,
          filter: leafFilter,
        }}
      />

      {Array.from({ length: 4 }, (_, index) => (
        <div
          key={index}
          className="va-wizard-robe"
          style={{
            position: 'absolute',
            left: 0,
            bottom: 0,
            width,
            height: robeHeight,
            transformOrigin: '50% 100%',
            transform: `rotateY(${index * 45}deg)`,
            backfaceVisibility: 'hidden',
            filter: leafFilter,
          }}
        >
          <div
            className="va-wizard-face"
            style={{ position: 'absolute', left: '50%', top: '18%', width: 7, height: 8, marginLeft: -3.5 }}
          />
        </div>
      ))}

      {Array.from({ length: 4 }, (_, index) => (
        <div
          key={`hat-${index}`}
          className="va-wizard-hat"
          style={{
            position: 'absolute',
            left: 1,
            top: 0,
            width: width - 2,
            height: hatHeight + 3,
            transformOrigin: '50% 100%',
            transform: `rotateY(${index * 45}deg)`,
            backfaceVisibility: 'hidden',
            filter: leafFilter,
          }}
        />
      ))}

      <div
        className="va-wizard-brim"
        style={{
          position: 'absolute',
          left: '50%',
          top: hatHeight - 1,
          width: width - 1,
          height: width - 1,
          marginLeft: -(width - 1) / 2,
          marginTop: -(width - 1) / 4,
          filter: leafFilter,
        }}
      />
    </div>
  );
}
