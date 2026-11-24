import type { CSSProperties } from 'react';
import type { TowerID } from '@wt/shared';
import { VISUAL_3D } from '../game/visual3d';
import { OCTAGON_CLIP, Prism3D } from './Prism3D';

interface Tower3DProps {
  towerId: TowerID;
  hasRavenShield: boolean;
  selectable?: boolean | undefined;
  inSlice?: boolean | undefined;
  onClick?: (() => void) | undefined;
  tier?: number | undefined;
}

/**
 * A01 / A02 / A03 / A04 —— 与 3D-asset-stage.html 的 tower() 同源。
 *
 * v2 修正（关键）：层亮度 brightness 只施加在「侧墙 / 顶面 / 城垛」这些叶子面上。
 * 上一版把 filter 放在外层 preserve-3d 容器上，浏览器会强制 flatten，
 * 8 面侧墙全部塌陷成平面 —— 这正是旧截图里塔看起来像贴片的原因。
 */
export function Tower3D({ towerId, hasRavenShield, selectable, inSlice, onClick, tier = 0 }: Tower3DProps) {
  const variant = hasRavenShield ? 'raven' : 'stone';
  // A04：逐层亮度递增但总差 ≤ 8%
  const brightness = 1 + Math.min(0.08, tier * 0.016);
  const leafFilter = `brightness(${brightness})`;
  const label = `${towerId}${hasRavenShield ? ' raven mark' : ''}`;
  // C05：切片选中 = 金实描边 + 上抬；可选起点 = 绿虚线环
  const outline = inSlice
    ? '2px solid #e8b339'
    : selectable
      ? '2px dashed #27ae60'
      : '1px solid rgba(42,38,30,0.55)';
  const h = VISUAL_3D.towerLayerHeight;
  const w = VISUAL_3D.towerBaseWidth;

  return (
    <div
      title={label}
      style={{
        position: 'relative',
        width: w,
        height: w,
        transformStyle: 'preserve-3d',
        // 仅切片选中上抬；9 层堆叠的 fit-all 高度不变
        transform: inSlice ? `translateZ(${VISUAL_3D.towerSideDepth}px)` : undefined,
        transition: 'transform 150ms ease',
      }}
    >
      <Prism3D
        sides={8}
        radius={w / 2}
        height={h}
        start={Math.PI / 8}
        withTop={false}
        sideClassName="va-tower-side"
        interactive={!!onClick}
        sideProps={() => ({ onClick, title: label })}
        sideVars={() =>
          ({
            '--side-top': variant === 'raven' ? '#66728d' : '#6a7180',
            '--side-bottom': variant === 'raven' ? '#424c62' : '#4a5060',
            filter: leafFilter,
            cursor: onClick ? 'pointer' : 'default',
          } as CSSProperties)
        }
        // A02：侧墙 0 / 4 面加低对比渡鸦剪影（素材台 decorate 同款）
        decorate={(index) =>
          index === 0 || index === 4 ? (
            <div
              className="va-raven-bird"
              style={{ position: 'absolute', left: '38%', top: '32%', width: 9, height: 7, opacity: 0.55 }}
            />
          ) : null
        }
        overlay={
          <>
            {/* A03 顶面：button 保留原点击语义，clip-path 与侧墙共用八边形顶点 */}
            <button
              className="va-tower-face"
              data-variant={variant}
              onClick={onClick}
              data-interactive={onClick ? '' : undefined}
              title={label}
              style={{
                position: 'absolute',
                left: 0,
                top: 0,
                width: w,
                height: w,
                clipPath: OCTAGON_CLIP,
                transform: `translateZ(${h}px)`,
                filter: leafFilter,
                border: outline,
                padding: 0,
                cursor: onClick ? 'pointer' : 'default',
                boxShadow:
                  inSlice || selectable
                    ? '0 0 12px rgba(232,179,57,0.65), inset 0 2px 0 rgba(255,240,205,0.5)'
                    : undefined,
                color: '#2c303b',
                fontSize: 9,
                fontWeight: 700,
                textShadow: '0 1px 0 rgba(255,255,255,0.45)',
              }}
            >
              {towerId}
            </button>

            {/* A03 城垛：半径 30 > 顶面内圈，中心 3×2 巫师位不被遮挡 */}
            {Array.from({ length: 8 }, (_, index) => {
              const angle = Math.PI / 8 + (index / 8) * Math.PI * 2;
              return (
                <div
                  key={index}
                  className="va-battlement"
                  data-variant={variant}
                  style={{
                    position: 'absolute',
                    left: '50%',
                    top: '50%',
                    width: 8,
                    height: 8,
                    marginLeft: -4,
                    marginTop: -4,
                    filter: leafFilter,
                    transform: `translate3d(${Math.cos(angle) * 30}px, ${Math.sin(angle) * 30}px, ${h + 4}px)`,
                  }}
                />
              );
            })}

            {/* A02 / C01 渡鸦蓝圆徽：顶面右上角立件，被上层塔压住即不可见 */}
            {hasRavenShield && (
              <div
                className="va-raven"
                title="乌鸦纹章"
                style={{
                  position: 'absolute',
                  top: 13,
                  right: 13,
                  width: 18,
                  height: 18,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  // 3px 侧壁厚度（等效），不引入第二套几何语汇
                  boxShadow: '0 2px 0 #224d82, 0 0 9px rgba(127,179,255,0.75)',
                  transform: `translateZ(${h + 6}px)`,
                }}
              >
                <div className="va-raven-bird" style={{ width: 11, height: 8, opacity: 0.9 }} />
              </div>
            )}
          </>
        }
      />
    </div>
  );
}
