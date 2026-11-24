import type { CSSProperties, HTMLAttributes, ReactNode } from 'react';

export interface Point2D {
  x: number;
  y: number;
}

/** 与 docs/visual-assets/3D-asset-stage.html 的 points()/clipFrom() 完全同源。
 *  顶面 clip-path 与侧墙必须共用这一组顶点，否则边会错位。 */
export function polygonPoints(sides: number, radius: number, start = 0): Point2D[] {
  return Array.from({ length: sides }, (_, index) => {
    const angle = start + (index / sides) * Math.PI * 2;
    return { x: Math.cos(angle) * radius, y: Math.sin(angle) * radius };
  });
}

export function clipFrom(pts: Point2D[], boxRadius: number): string {
  return (
    'polygon(' +
    pts
      .map(
        (p) =>
          `${(((p.x + boxRadius) / (boxRadius * 2)) * 100).toFixed(2)}% ${(((p.y + boxRadius) / (boxRadius * 2)) * 100).toFixed(2)}%`,
      )
      .join(', ') +
    ')'
  );
}

export const OCTAGON_CLIP =
  'polygon(30% 0%,70% 0%,100% 30%,100% 70%,70% 100%,30% 100%,0% 70%,0% 30%)';

export interface Prism3DProps {
  sides: number;
  /** 外接圆半径，盒子边长 = radius * 2 */
  radius: number;
  /** 体块高度（Z 方向） */
  height: number;
  z?: number;
  start?: number;
  pts?: Point2D[];
  clip?: string;
  topClassName?: string;
  topStyle?: CSSProperties;
  topChildren?: ReactNode;
  withTop?: boolean;
  sideClassName?: string;
  sideStyle?: CSSProperties;
  /** 每片侧墙的 CSS 变量（如 --side-top），只能是叶子面属性 */
  sideVars?: (index: number) => CSSProperties;
  /** 侧墙事件属性（塔的 8 面墙体需要保留原有点击语义） */
  sideProps?: (index: number) => HTMLAttributes<HTMLDivElement>;
  /** 侧墙参与舞台交互（阻止拖动相机） */
  interactive?: boolean;
  /** 贴在侧墙内表面的装饰（金窗、门楣、乌鸦剪影等） */
  decorate?: (index: number) => ReactNode;
  /** 追加在 wrap 内的立件（城垛、圆徽、旗杆等），调用方自行给 translateZ */
  overlay?: ReactNode;
  className?: string;
  style?: CSSProperties;
  extraTransform?: string;
}

/**
 * 真 CSS 3D 棱柱：顶面 clip-path + translateZ(h) + N 片竖立侧墙 rotateX(90deg)。
 * 复刻 3D-asset-stage.html 的 prism()，供 A/B/C/D/E/F 全部体块复用。
 *
 * 硬规则（README v2 §1.4 / §3.7）：
 *   wrap 是 preserve-3d 容器，**禁止** filter / opacity<1 / clip-path / overflow:hidden，
 *   否则浏览器强制 flatten，所有侧墙塌陷成平面。提亮、降饱和只能施加在叶子面元素上。
 */
export function Prism3D({
  sides,
  radius,
  height,
  z = 0,
  start = Math.PI / 8,
  pts,
  clip,
  topClassName,
  topStyle,
  topChildren,
  withTop = true,
  sideClassName,
  sideStyle,
  sideVars,
  sideProps,
  interactive,
  decorate,
  overlay,
  className,
  style,
  extraTransform = '',
}: Prism3DProps) {
  const vertices = pts ?? polygonPoints(sides, radius, start);
  const size = radius * 2;
  const finalClip = clip ?? clipFrom(vertices, radius);

  return (
    <div
      className={className}
      style={{
        position: 'absolute',
        left: '50%',
        top: '50%',
        width: size,
        height: size,
        marginLeft: -radius,
        marginTop: -radius,
        transformStyle: 'preserve-3d',
        transform: `translateZ(${z}px) ${extraTransform}`.trim(),
        ...style,
      }}
    >
      {withTop && (
        <div
          className={topClassName}
          style={{
            position: 'absolute',
            left: '50%',
            top: '50%',
            width: size,
            height: size,
            marginLeft: -radius,
            marginTop: -radius,
            clipPath: finalClip,
            transform: `translateZ(${height}px)`,
            ...topStyle,
          }}
        >
          {topChildren}
        </div>
      )}

      {vertices.map((p, index) => {
        const q = vertices[(index + 1) % vertices.length]!;
        const edge = Math.hypot(q.x - p.x, q.y - p.y);
        const mx = (p.x + q.x) / 2;
        const my = (p.y + q.y) / 2;
        const angle = Math.atan2(q.y - p.y, q.x - p.x);
        const width = edge + 1;
        return (
          <div
            key={index}
            className={sideClassName}
            {...sideProps?.(index)}
            data-interactive={interactive ? '' : undefined}
            style={{
              position: 'absolute',
              left: '50%',
              top: '50%',
              width,
              height,
              marginLeft: -width / 2,
              marginTop: -height / 2,
              transformOrigin: 'center center',
              backfaceVisibility: 'hidden',
              transform: `translate3d(${mx}px,${my}px,${height / 2}px) rotateZ(${angle}rad) rotateX(90deg)`,
              ...sideStyle,
              ...sideVars?.(index),
            }}
          >
            {decorate?.(index)}
          </div>
        );
      })}

      {overlay}
    </div>
  );
}
