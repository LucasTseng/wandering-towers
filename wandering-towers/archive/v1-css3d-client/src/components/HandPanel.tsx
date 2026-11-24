import type { GameState, PlayerID, CardID } from '@wt/shared';
import { cardLabel, getCardTemplate } from '../game/cardHelper';
import { MovementCardType } from '@wt/shared';

interface HandPanelProps {
  state: GameState;
  playerId: PlayerID;
  selectedCardId?: CardID | null;
  onCardClick?: (cardId: CardID) => void;
  disabled?: boolean;
}

/**
 * D01 实体移动卡 —— v2 真 3D：62 × 84 × 6，4 片矩形侧墙 + translateZ(6) 正面。
 * 与 3D-asset-stage.html 的 bookCard() 同源；矩形不走正多边形 prism，手写 4 顶点。
 * 尺寸按素材规格原样落地，手牌区改为换行排布（320px 侧栏每行 4 张）。
 */
export function HandPanel({ state, playerId, selectedCardId, onCardClick, disabled }: HandPanelProps) {
  const player = state.players[playerId];
  if (!player) return null;
  return (
    <div className="va-panel va-panel-thick" style={{ padding: 6, minWidth: 0 }}>
      <div className="va-panel-title">手牌 · {playerId}</div>
      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
        {player.hand.map((cardId) => {
          const tmpl = getCardTemplate(state, cardId);
          const isWizard = tmpl?.type === MovementCardType.MOVE_WIZARD;
          const isTower = tmpl?.type === MovementCardType.MOVE_TOWER;
          const isEither = tmpl?.type === MovementCardType.MOVE_WIZARD_OR_TOWER;
          const isSelected = selectedCardId === cardId;
          const step = tmpl?.moveValueMode === 'FIXED' ? `${tmpl.fixedValue ?? '?'}` : '骰';
          return (
            <BookCard
              key={cardId}
              label={cardLabel(state, cardId)}
              step={step}
              showTower={!!(isTower || isEither)}
              showWizard={!!(isWizard || isEither)}
              selected={isSelected}
              disabled={!!disabled}
              onClick={() => onCardClick?.(cardId)}
            />
          );
        })}
        {player.hand.length === 0 && (
          <div style={{ color: '#a0a8b8', fontSize: 11, padding: '8px 4px' }}>无手牌</div>
        )}
      </div>
    </div>
  );
}

function BookCard({
  label,
  step,
  showTower,
  showWizard,
  selected,
  disabled,
  onClick,
}: {
  label: string;
  step: string;
  showTower: boolean;
  showWizard: boolean;
  selected: boolean;
  disabled: boolean;
  onClick: () => void;
}) {
  const w = 62;
  const h = 84;
  const thick = 6;
  const rect = [
    { x: -w / 2, y: -h / 2 },
    { x: w / 2, y: -h / 2 },
    { x: w / 2, y: h / 2 },
    { x: -w / 2, y: h / 2 },
  ];

  return (
    <div className="va-ui-3d" style={{ position: 'relative', width: w, height: h, flex: '0 0 auto' }}>
      <button
        className="va-book-card"
        data-selected={selected ? '1' : '0'}
        onClick={onClick}
        disabled={disabled}
        style={{
          position: 'absolute',
          inset: 0,
          width: w,
          height: h,
          padding: 0,
          border: 'none',
          background: 'transparent',
          transformStyle: 'preserve-3d',
          cursor: disabled ? 'not-allowed' : 'pointer',
        }}
      >
      {/* 4 片侧墙 = 6px 真实厚度 */}
      {rect.map((p, index) => {
        const q = rect[(index + 1) % rect.length]!;
        const edge = Math.hypot(q.x - p.x, q.y - p.y);
        const mx = (p.x + q.x) / 2;
        const my = (p.y + q.y) / 2;
        const angle = Math.atan2(q.y - p.y, q.x - p.x);
        const sw = edge + 1;
        return (
          <div
            key={index}
            className="va-book-side"
            style={{
              position: 'absolute',
              left: '50%',
              top: '50%',
              width: sw,
              height: thick,
              marginLeft: -sw / 2,
              marginTop: -thick / 2,
              transformOrigin: 'center center',
              backfaceVisibility: 'hidden',
              transform: `translate3d(${mx}px,${my}px,${thick / 2}px) rotateZ(${angle}rad) rotateX(90deg)`,
              opacity: disabled ? 0.55 : 1,
            }}
          />
        );
      })}

      {/* 正面：书脊 / 左塔 / 右巫师 / 双角标 / 标签 */}
      <div
        className="va-book-face"
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          width: w,
          height: h,
          transform: `translateZ(${thick}px)`,
          boxShadow: selected
            ? '0 0 0 2px #e8b339, 0 6px 16px rgba(232,179,57,0.42), inset 0 1px 0 rgba(255,250,230,0.6)'
            : '0 4px 10px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,250,230,0.6)',
          opacity: disabled ? 0.6 : 1,
        }}
      >
        <div className="va-book-spine" style={{ position: 'absolute', left: '50%', top: 2, bottom: 2, width: 2, marginLeft: -1 }} />
        {showTower && (
          <div className="va-book-glyph-tower" style={{ position: 'absolute', left: 8, top: 26 }} />
        )}
        {showWizard && (
          <div className="va-book-glyph-wizard" style={{ position: 'absolute', right: 10, top: 26 }} />
        )}
        <div className="va-book-corner" style={{ position: 'absolute', top: 2, left: 2 }}>{step}</div>
        <div className="va-book-corner" style={{ position: 'absolute', top: 2, right: 2 }}>{step}</div>
        <div
          style={{
            position: 'absolute',
            left: 4,
            right: 4,
            bottom: 4,
            padding: '1px 0',
            borderRadius: 2,
            background: 'rgba(233,217,181,0.9)',
            textAlign: 'center',
            fontSize: 9,
            fontWeight: 700,
            color: '#3b3324',
            whiteSpace: 'nowrap',
          }}
        >
          {label}
        </div>
      </div>

      <span className="va-book-shadow" />
      </button>
    </div>
  );
}
