import { VISUAL_3D } from '../game/visual3d';
import { OCTAGON_CLIP, Prism3D } from './Prism3D';

/**
 * A05 鸦堡 —— 与 3D-asset-stage.html 的 castle() 同源：
 * 8 面柱体（prism）+ 7 层收缩水平八边形圆盘成真锥顶 + 旗杆 / 酒红旗 / 金窗 / 城门。
 * 宽 48 ≈ 塔顶 76 的 63%，符合 A05「55–65%」约束。
 */
export function Castle3D() {
  const size = VISUAL_3D.castleSize;
  const radius = size / 2;
  const bodyHeight = VISUAL_3D.castleHeight * 0.54;
  const roofHeight = VISUAL_3D.castleHeight - bodyHeight;

  return (
    <div
      title="Raven castle"
      style={{ position: 'relative', width: size, height: size, transformStyle: 'preserve-3d' }}
    >
      <Prism3D
        sides={8}
        radius={radius}
        height={bodyHeight}
        start={Math.PI / 8}
        sideClassName="va-castle-side"
        topStyle={{
          background: 'linear-gradient(135deg, #5c6379 0%, #3b4158 62%, #2b3042 100%)',
          boxShadow: 'inset 0 2px 0 rgba(255,255,255,0.18)',
        }}
        decorate={(index) => (
          <>
            {index % 2 === 0 && (
              <div
                className="va-window"
                style={{ position: 'absolute', left: '38%', top: '24%', width: 7, height: 9 }}
              />
            )}
            {(index === 0 || index === 4) && (
              <div
                className="va-door"
                style={{ position: 'absolute', left: '36%', bottom: 0, width: '28%', height: '38%' }}
              />
            )}
          </>
        )}
        overlay={
          <>
            {/* 底部接触阴影 */}
            <div
              style={{
                position: 'absolute',
                left: '50%',
                top: '50%',
                width: size * 1.15,
                height: size * 0.5,
                marginLeft: -(size * 1.15) / 2,
                marginTop: -(size * 0.5) / 2,
                borderRadius: '50%',
                background: 'radial-gradient(ellipse at 50% 50%, rgba(0,0,0,0.5), transparent 70%)',
                transform: 'translateZ(1px)',
              }}
            />

            {/* 7 层收缩圆盘 = 真锥顶（非竖立三角纸片） */}
            {Array.from({ length: 7 }, (_, index) => {
              const k = 1 - index / 7;
              const w = size * 0.94 * k;
              return (
                <div
                  key={`roof-${index}`}
                  className="va-roof"
                  style={{
                    position: 'absolute',
                    left: '50%',
                    top: '50%',
                    width: w,
                    height: w,
                    marginLeft: -w / 2,
                    marginTop: -w / 2,
                    clipPath: OCTAGON_CLIP,
                    filter: `brightness(${0.82 + index * 0.045})`,
                    transform: `translateZ(${bodyHeight + ((index + 1) * roofHeight) / 7}px)`,
                  }}
                />
              );
            })}

            {/* 渡鸦尖塔 + 酒红旗 */}
            <div
              style={{
                position: 'absolute',
                left: '50%',
                top: '50%',
                width: 2,
                height: 12,
                marginLeft: -1,
                marginTop: -12,
                background: 'linear-gradient(180deg, #d9c9a3, #7a6c50)',
                transformOrigin: '50% 100%',
                transform: `translateZ(${bodyHeight + roofHeight}px) rotateX(90deg)`,
              }}
            />
            <div
              style={{
                position: 'absolute',
                left: '50%',
                top: '50%',
                width: 9,
                height: 6,
                marginLeft: 1,
                marginTop: -17,
                background: 'linear-gradient(90deg, #7a2436, #4a1c2b)',
                clipPath: 'polygon(0% 0%,100% 30%,0% 100%)',
                transform: `translateZ(${bodyHeight + roofHeight + 6}px) rotateX(90deg)`,
              }}
            />

            {/* 门楣渡鸦剪影（C01 同款） */}
            <div
              className="va-raven-bird"
              style={{
                position: 'absolute',
                left: '50%',
                top: '50%',
                width: 9,
                height: 7,
                marginLeft: -4.5,
                marginTop: -bodyHeight * 0.18,
                opacity: 0.9,
                transform: `translateZ(${bodyHeight + 1}px)`,
              }}
            />
          </>
        }
      />
    </div>
  );
}
