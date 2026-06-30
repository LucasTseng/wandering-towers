import { useState } from 'react';

interface DiceProps {
  /** 当前点数；null 表示尚未掷出（可点击掷骰） */
  value: number | null;
  /** 掷骰回调（仅在 value===null 时触发） */
  onRoll?: () => void;
}

/** 骰子面圆点位置（3x3 网格，1~6） */
const PIP_POSITIONS: Record<number, [number, number][]> = {
  1: [[1, 1]],
  2: [[0, 0], [2, 2]],
  3: [[0, 0], [1, 1], [2, 2]],
  4: [[0, 0], [0, 2], [2, 0], [2, 2]],
  5: [[0, 0], [0, 2], [1, 1], [2, 0], [2, 2]],
  6: [[0, 0], [0, 2], [1, 0], [1, 2], [2, 0], [2, 2]],
};

const DICE_SIZE = 44;

/**
 * 骰子牌掷骰组件。
 * - value===null：显示「点击掷骰」可点击按钮，点击后调 onRoll。
 * - value 为 1~6：显示对应点数圆点面，不可点击。
 */
export function Dice({ value, onRoll }: DiceProps) {
  const [spinning, setSpinning] = useState(false);
  const rolled = value !== null;

  const handleClick = () => {
    if (rolled || spinning || !onRoll) return;
    setSpinning(true);
    // 短暂抖动动画后真正掷出
    window.setTimeout(() => {
      setSpinning(false);
      onRoll();
    }, 180);
  };

  const pips = rolled && value !== null ? PIP_POSITIONS[value] ?? [] : [];

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <button
        onClick={handleClick}
        disabled={rolled}
        title={rolled ? `已掷出 ${value} 点` : '点击掷骰'}
        style={{
          width: DICE_SIZE,
          height: DICE_SIZE,
          padding: 0,
          border: '1px solid rgba(35,43,30,0.5)',
          borderRadius: 8,
          background: 'linear-gradient(135deg, #f4ead1 0%, #d9c89a 62%, #b89e63 100%)',
          boxShadow: rolled
            ? 'inset 0 1px 0 rgba(255,255,255,0.4), 0 1px 3px rgba(0,0,0,0.3)'
            : '0 0 10px rgba(255,215,0,0.7), inset 0 1px 0 rgba(255,255,255,0.4)',
          cursor: rolled ? 'default' : 'pointer',
          position: 'relative',
          transform: spinning ? 'rotate(35deg) scale(0.92)' : 'none',
          transition: 'transform 120ms ease',
        }}
      >
        {/* 圆点面 */}
        <div
          style={{
            position: 'absolute',
            inset: 6,
            display: 'grid',
            gridTemplateColumns: '1fr 1fr 1fr',
            gridTemplateRows: '1fr 1fr 1fr',
          }}
        >
          {Array.from({ length: 9 }, (_, i) => {
            const row = Math.floor(i / 3);
            const col = i % 3;
            const has = pips.some(([r, c]) => r === row && c === col);
            return (
              <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {has && (
                  <div
                    style={{
                      width: 7,
                      height: 7,
                      borderRadius: '50%',
                      background: '#2c3e50',
                      boxShadow: 'inset 0 1px 1px rgba(0,0,0,0.4)',
                    }}
                  />
                )}
              </div>
            );
          })}
          {!rolled && (
            <div
              style={{
                gridColumn: '1 / 4',
                gridRow: '1 / 4',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 11,
                fontWeight: 700,
                color: '#2c3e50',
              }}
            >
              掷
            </div>
          )}
        </div>
      </button>
      <span style={{ fontSize: 12, color: '#2c3e50' }}>
        {rolled ? `${value} 点` : '点击骰子掷出点数'}
      </span>
    </div>
  );
}
