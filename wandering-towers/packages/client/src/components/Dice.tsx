import { useState } from 'react';

interface DiceProps {
  /** 当前点数；null 表示尚未掷出（可点击掷骰） */
  value: number | null;
  /** 掷骰回调（仅在 value===null 时触发） */
  onRoll?: () => void;
}

/** 骰面圆点百分比坐标（与 3D-asset-stage.html 的 pipPos 同源） */
const PIP_POS: Record<number, [number, number][]> = {
  1: [[50, 50]],
  2: [[26, 26], [74, 74]],
  3: [[26, 26], [50, 50], [74, 74]],
  4: [[26, 26], [74, 26], [26, 74], [74, 74]],
  5: [[26, 26], [74, 26], [50, 50], [26, 74], [74, 74]],
  6: [[26, 26], [74, 26], [26, 50], [74, 50], [26, 74], [74, 74]],
};

const SIZE = 24;
const HALF = SIZE / 2;

/**
 * D04 木质六面骰 —— v2 真 3D：24³ 立方体，6 个独立面各自带刻痕点阵，
 * 不再是平面贴图按钮。与 3D-asset-stage.html 的 die() 同源。
 * 正面显示当前点数 / 「掷」，其余 5 面固定 2/3/4/1/6。
 */
export function Dice({ value, onRoll }: DiceProps) {
  const [spinning, setSpinning] = useState(false);
  const rolled = value !== null;

  const handleClick = () => {
    if (rolled || spinning || !onRoll) return;
    setSpinning(true);
    window.setTimeout(() => {
      setSpinning(false);
      onRoll();
    }, 180);
  };

  const faces: { tr: string; n: number | null; front?: boolean }[] = [
    { tr: `translateZ(${HALF}px)`, n: value, front: true },
    { tr: `rotateY(180deg) translateZ(${HALF}px)`, n: 2 },
    { tr: `rotateY(90deg) translateZ(${HALF}px)`, n: 3 },
    { tr: `rotateY(-90deg) translateZ(${HALF}px)`, n: 4 },
    { tr: `rotateX(90deg) translateZ(${HALF}px)`, n: 1 },
    { tr: `rotateX(-90deg) translateZ(${HALF}px)`, n: 6 },
  ];

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <div
        className="va-ui-3d"
        style={{ position: 'relative', width: 44, height: 44, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
      >
        <button
          onClick={handleClick}
          disabled={rolled}
          title={rolled ? `已掷出 ${value} 点` : '点击掷骰'}
          style={{
            position: 'relative',
            width: SIZE,
            height: SIZE,
            padding: 0,
            border: 'none',
            background: 'transparent',
            transformStyle: 'preserve-3d',
            transform: spinning ? 'rotate(35deg) scale(0.92)' : 'rotateX(-18deg) rotateY(22deg)',
            transition: 'transform 120ms ease',
            cursor: rolled ? 'default' : 'pointer',
          }}
        >
          {faces.map(({ tr, n, front }, index) => (
            <div
              key={index}
              className="va-die-face"
              style={{ position: 'absolute', inset: 0, transform: tr, backfaceVisibility: 'hidden' }}
            >
              {n === null ? (
                <div
                  style={{
                    position: 'absolute',
                    inset: 0,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 10,
                    fontWeight: 700,
                    color: '#f5e9c8',
                    textShadow: '0 1px 1px rgba(0,0,0,0.6)',
                  }}
                >
                  掷
                </div>
              ) : (
                (PIP_POS[n] ?? []).map(([x, y], i) => (
                  <div
                    key={i}
                    className="va-pip"
                    style={{ position: 'absolute', left: `${x}%`, top: `${y}%`, width: 4, height: 4, marginLeft: -2, marginTop: -2 }}
                  />
                ))
              )}
              {front && rolled && (
                <div style={{ position: 'absolute', inset: 0, boxShadow: '0 0 9px rgba(232,179,57,0.5)', pointerEvents: 'none' }} />
              )}
            </div>
          ))}
        </button>
      </div>
      <span style={{ fontSize: 12, color: '#f5e9c8' }}>
        {rolled ? `${value} 点` : '点击骰子掷出点数'}
      </span>
    </div>
  );
}
