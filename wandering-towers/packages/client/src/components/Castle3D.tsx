import { VISUAL_3D } from '../game/visual3d';

export function Castle3D() {
  const size = VISUAL_3D.castleSize;
  const height = VISUAL_3D.castleHeight;

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
      <div
        style={{
          position: 'absolute',
          left: 4,
          right: 4,
          bottom: 3,
          height: 18,
          borderRadius: 6,
          background: 'linear-gradient(180deg, #33364a 0%, #191b2c 100%)',
          boxShadow: '0 9px 13px rgba(0,0,0,0.34)',
          transform: `translateZ(${height / 2}px) rotateX(72deg)`,
        }}
      />
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: 'linear-gradient(135deg, #55596e 0%, #34384c 62%, #202437 100%)',
          clipPath: 'polygon(14% 0%, 36% 0%, 36% 16%, 48% 16%, 48% 0%, 70% 0%, 70% 16%, 84% 16%, 84% 100%, 14% 100%)',
          boxShadow: 'inset 0 2px 0 rgba(255,255,255,0.16), 0 0 12px rgba(0,0,0,0.28)',
          transform: `translateZ(${height}px)`,
        }}
      >
        <div
          style={{
            position: 'absolute',
            left: '50%',
            top: '50%',
            width: 18,
            height: 15,
            marginLeft: -9,
            marginTop: -7,
            background: '#111423',
            clipPath: 'polygon(50% 0%, 0% 100%, 100% 100%)',
            opacity: 0.9,
          }}
        />
      </div>
    </div>
  );
}
