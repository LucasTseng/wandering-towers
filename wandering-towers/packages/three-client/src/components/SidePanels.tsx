import type { CardID, GameState, PlayerID, SpellID } from '@wt/shared';
import { MovementCardType, PotionState as PS } from '@wt/shared';
import { cardLabel, getCardTemplate } from '../game/cardHelper';
import { HIDDEN_SPELLS, SPELL_POTION_COST, SPELL_ZH_DESC, SPELL_ZH_NAME } from '../game/config';
import { playerName } from '../scene/pieces';

/* ---------------- 当前回合 ---------------- */
export function PlayerPanel({
  state,
  playerId,
  phaseLabel,
  actionIndex,
  color,
}: {
  state: GameState;
  playerId: PlayerID;
  phaseLabel: string;
  actionIndex: number;
  color: string;
}) {
  const player = state.players[playerId];
  if (!player) return null;
  const wizards = player.wizardIds.map((id) => state.wizards[id]).filter(Boolean);
  const inCastle = wizards.filter((w) => w?.state.mode === 'IN_CASTLE').length;
  const onBoard = wizards.filter((w) => w?.state.mode === 'ON_GROUND' || w?.state.mode === 'ON_TOWER_TOP').length;
  const imprisoned = wizards.filter((w) => w?.state.mode === 'IMPRISONED').length;
  const potions = player.potionIds.map((pid) => state.potions[pid]?.state ?? PS.EMPTY);
  const full = potions.filter((s) => s === PS.FULL).length;
  const empty = potions.filter((s) => s === PS.EMPTY).length;
  const spent = potions.filter((s) => s === PS.SPENT).length;
  const maxSpells = state.config.spellSetup.maxSpellsPerTurn;
  const spellsLeft = Math.max(0, maxSpells - player.spellsCastThisTurn);
  const total = player.wizardIds.length || 1;

  return (
    <section className="va-panel panel-player">
      <div className="panel-head">
        <svg className="panel-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.35">
          <path d="M12 3 5 6v5c0 4.5 2.8 7.6 7 10 4.2-2.4 7-5.5 7-10V6l-7-3Z" />
          <path d="M9 12h6M12 9v6" />
        </svg>
        <span className="panel-title">当前回合</span>
        <span className="panel-meta">
          第 <strong>{state.roundNumber}</strong> 轮 · {phaseLabel} {actionIndex}/2
        </span>
      </div>
      <div className="player-summary">
        <div className="player-medallion">
          <svg className="shield-bg" viewBox="0 0 60 66" aria-hidden="true">
            <defs>
              <linearGradient id={`shield-${playerId}`} x1="0" y1="0" x2="1" y2="1">
                <stop stopColor={color} stopOpacity="0.95" />
                <stop offset="0.62" stopColor={color} stopOpacity="0.72" />
                <stop offset="1" stopColor="#2a2119" stopOpacity="0.85" />
              </linearGradient>
            </defs>
            <path d="M30 2 55 11v23c0 14-9 24-25 30C14 58 5 48 5 34V11Z" fill="#c09851" />
            <path d="M30 6 51 14v20c0 12-8 21-21 26C17 55 9 46 9 34V14Z" fill={`url(#shield-${playerId})`} stroke="#efd18b" strokeWidth="0.8" />
            <path d="M30 6v54" stroke="#e9c778" strokeWidth="0.55" opacity="0.35" />
          </svg>
          <svg className="wizard-mark" viewBox="0 0 24 32" aria-hidden="true">
            <path d="M12 1 18 16 15 30H9.5L6 16Z" fill="#f1d8ae" />
            <path d="M4 17c4-1.8 12-1.8 16 0l-1.7 2H5.7Z" fill="#f8e7c6" />
            <circle cx="12" cy="14" r="3.2" fill="#3d2b25" />
          </svg>
        </div>
        <div className="player-copy">
          <div className="player-overline">{playerId} · CURRENT PLAYER</div>
          <div className="player-name">{playerName(playerId)}</div>
          <div className="player-state">目标：{total} 名巫师进入鸦堡</div>
          <div className="progress-line">
            <div
              className="progress-fill"
              style={{ width: `${Math.round((inCastle / total) * 100)}%`, background: `linear-gradient(90deg, ${color}, #d8a95c)` }}
            />
          </div>
          <div className="progress-markers">
            <span>已进堡 {inCastle}</span>
            <span>{total}</span>
          </div>
          <div className="player-tags">
            <span className="stat-tag"><i className="stat-dot" />满瓶 {full}</span>
            <span className="stat-tag"><i className="stat-dot" style={{ background: '#7d8c74' }} />空瓶 {empty}</span>
            <span className="stat-tag"><i className="stat-dot" style={{ background: '#8c6a5a' }} />已耗 {spent}</span>
            <span className="stat-tag"><i className="stat-dot" style={{ background: '#3d8c82' }} />法术 {spellsLeft}</span>
            <span className="stat-tag"><i className="stat-dot" style={{ background: '#6b7f9a' }} />场上 {onBoard}</span>
            {imprisoned > 0 && (
              <span className="stat-tag" title="被封印在塔内的己方巫师">
                <i className="stat-dot" style={{ background: '#9a5b8a' }} />封印 {imprisoned}
              </span>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

/* ---------------- 手牌 ---------------- */
const TOWER_ICON = (
  <svg className="book-icon tower" viewBox="0 0 24 34" fill="none" aria-hidden="true">
    <path d="M3 11 6 7h12l3 4-3 4v17H6V15Z" fill="currentColor" />
    <path d="M6 15h12v13H6Z" fill="#f1dfb6" />
    <path d="M6 15h12M8 18h8M8 21h8M8 24h8" stroke="#a27d43" strokeWidth="1" />
    <path d="M9 7V4h6v3" stroke="currentColor" strokeWidth="2" />
  </svg>
);
const WIZARD_ICON = (
  <svg className="book-icon wizard" viewBox="0 0 24 34" fill="none" aria-hidden="true">
    <path d="m12 2 5 14-2 15H9L7 16Z" fill="currentColor" />
    <path d="M5 17c4-2 10-2 14 0l-1.5 3h-11Z" fill="#f7e5bf" />
    <circle cx="12" cy="14" r="3.1" fill="#3a2922" />
    <path d="m13.3 16.5 1 1.5-1.5-.3Z" fill="#f4ca68" />
  </svg>
);

function bookSides(width: number, height: number, depth: number): string {
  const rect = [
    { x: -width / 2, y: -height / 2 },
    { x: width / 2, y: -height / 2 },
    { x: width / 2, y: height / 2 },
    { x: -width / 2, y: height / 2 },
  ];
  return rect
    .map((p, index) => {
      const q = rect[(index + 1) % 4]!;
      const edge = Math.hypot(q.x - p.x, q.y - p.y);
      const mx = (p.x + q.x) / 2;
      const my = (p.y + q.y) / 2;
      const angle = Math.atan2(q.y - p.y, q.x - p.x);
      return `<i class="book-side" style="left:50%;top:50%;width:${edge + 1}px;height:${depth}px;margin-left:${-(edge + 1) / 2}px;margin-top:${-depth / 2}px;transform:translate3d(${mx}px,${my}px,${depth / 2}px) rotateZ(${angle}rad) rotateX(90deg)"></i>`;
    })
    .join('');
}

export function HandPanel({
  state,
  playerId,
  selectedCardId,
  onCardClick,
  disabled,
}: {
  state: GameState;
  playerId: PlayerID;
  selectedCardId: CardID | null;
  onCardClick: (cardId: CardID) => void;
  disabled: boolean;
}) {
  const player = state.players[playerId];
  if (!player) return null;
  return (
    <section className="va-panel panel-hand">
      <div className="panel-head">
        <svg className="panel-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.35">
          <path d="M4 5.5C7 3.8 9.5 4 12 6c2.5-2 5-2.2 8-.5v13c-3-1.7-5.5-1.5-8 .5-2.5-2-5-2.2-8-.5Z" />
          <path d="M12 6v13" />
        </svg>
        <span className="panel-title">移动魔典</span>
        <span className="panel-meta">
          {selectedCardId ? '已选 · 待指定目标' : `手牌 ${player.hand.length} 张`}
        </span>
      </div>
      <div className="hand-row">
        {player.hand.map((cardId) => {
          const tmpl = getCardTemplate(state, cardId);
          const isWizard = tmpl?.type === MovementCardType.MOVE_WIZARD;
          const isTower = tmpl?.type === MovementCardType.MOVE_TOWER;
          const isEither = tmpl?.type === MovementCardType.MOVE_WIZARD_OR_TOWER;
          const step = tmpl?.moveValueMode === 'FIXED' ? `${tmpl.fixedValue ?? '?'}` : '骰';
          return (
            <div className="book-slot" key={cardId}>
              <button
                type="button"
                className="book-card"
                data-selected={selectedCardId === cardId ? '1' : '0'}
                disabled={disabled}
                onClick={() => onCardClick(cardId)}
                aria-label={cardLabel(state, cardId)}
                title={`${cardLabel(state, cardId)}${disabled ? '（当前不可出牌）' : ''}`}
              >
                <span className="book-depth" dangerouslySetInnerHTML={{ __html: bookSides(62, 92, 7) }} />
                <span className="book-face">
                  <span className="book-spine" />
                  <span className="book-step">{step}</span>
                  <span className="book-scene">
                    {(isTower || isEither) && TOWER_ICON}
                    {(isWizard || isEither) && WIZARD_ICON}
                  </span>
                  <span className="book-label">{cardLabel(state, cardId)}</span>
                </span>
                <span className="book-shadow" />
              </button>
            </div>
          );
        })}
        {player.hand.length === 0 && <div className="hand-empty">无手牌 · 回合结束后补至 3 张</div>}
      </div>
    </section>
  );
}

/* ---------------- 魔法药水 ---------------- */
export function PotionPanel({ state, playerId, color }: { state: GameState; playerId: PlayerID; color: string }) {
  const player = state.players[playerId];
  if (!player) return null;
  const states = player.potionIds.map((pid) => state.potions[pid]?.state ?? PS.EMPTY);
  const full = states.filter((s) => s === PS.FULL).length;
  const empty = states.filter((s) => s === PS.EMPTY).length;
  const spent = states.filter((s) => s === PS.SPENT).length;

  return (
    <section className="va-panel panel-potions">
      <div className="panel-head">
        <svg className="panel-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.35">
          <path d="M9 3h6m-5 0v5l-3.3 6.5A4.5 4.5 0 0 0 11 21h2a4.5 4.5 0 0 0 4.3-6.5L14 8V3" />
          <path d="M7.7 14h8.6" />
        </svg>
        <span className="panel-title">魔法药水</span>
        <span className="panel-meta">
          满 <strong>{full}</strong> · 空 {empty} · 耗 {spent}
        </span>
      </div>
      <div className="potion-row">
        {states.map((ps, index) => (
          <Potion key={index} state={ps} color={color} />
        ))}
      </div>
      <div className="potion-note">
        施法消耗 1 瓶满药水；空瓶需先通过塔移动补满，才会重新可用。
      </div>
    </section>
  );
}

function Potion({ state, color }: { state: string; color: string }) {
  const isFull = state === 'FULL';
  const isSpent = state === 'SPENT';
  const label = isFull ? '满' : isSpent ? '已耗' : '空';
  const liquidY = isFull ? 18 : 34;
  const liquidColor = isFull ? color : 'rgba(154,168,174,0.45)';
  return (
    <div className="potion-unit" title={`${label}药水`}>
      <svg viewBox="0 0 40 66" aria-hidden="true">
        <defs>
          <linearGradient id={`glass-${state}`} x1="0" y1="0" x2="1" y2="1">
            <stop stopColor="rgba(255,255,245,0.85)" />
            <stop offset="0.45" stopColor="rgba(196,214,214,0.42)" />
            <stop offset="1" stopColor="rgba(120,142,144,0.4)" />
          </linearGradient>
        </defs>
        <path
          d="M15 12h10v10c0 2 1 3.4 2.6 4.8A13.6 13.6 0 0 1 32 37.6c0 8.3-5.4 14.4-12 14.4S8 45.9 8 37.6c0-4.4 1.8-7.6 4.4-10.8C14 25.4 15 24 15 22Z"
          fill={`url(#glass-${state})`}
          stroke="rgba(96,116,116,0.55)"
          strokeWidth="1.1"
        />
        {!isSpent || isSpent ? (
          <path
            d={`M10.6 37.6c0-3.9 1.7-6.9 4.1-9.8H25.3c2.4 2.9 4.1 5.9 4.1 9.8 0 8-4.6 13.1-9.4 13.1s-9.4-5.1-9.4-13.1Z`}
            fill={liquidColor}
            opacity={isFull ? 0.92 : 0.3}
          />
        ) : null}
        <ellipse cx="20" cy={liquidY} rx="7.4" ry="1.6" fill={isFull ? '#fff2c9' : 'rgba(255,255,255,0.25)'} opacity={isFull ? 0.55 : 0.2} />
        <rect x="15" y="4" width="10" height="8" rx="2.4" fill={isSpent ? '#a8927b' : '#9d7a4d'} />
        <rect x="14.2" y="2.6" width="11.6" height="3.2" rx="1.6" fill={isSpent ? '#b7a58c' : '#b98f57'} transform={isSpent ? 'rotate(-16 20 4)' : undefined} />
        <path d="M14.5 20.5c-1.2 1.2-1.9 2.6-2.3 4.2" stroke="rgba(255,255,250,0.8)" strokeWidth="1.6" strokeLinecap="round" fill="none" />
      </svg>
      <div className={`potion-state${isFull ? ' is-full' : ''}`}>{label}</div>
    </div>
  );
}

/* ---------------- 法术符文 ---------------- */
export function SpellPanel({
  state,
  playerId,
  onCastSpell,
  disabled,
}: {
  state: GameState;
  playerId: PlayerID;
  onCastSpell: (spellId: SpellID) => void;
  disabled: boolean;
}) {
  const player = state.players[playerId];
  const maxSpells = state.config.spellSetup.maxSpellsPerTurn;
  const remaining = maxSpells - (player?.spellsCastThisTurn ?? 0);
  const fullPotions = player?.potionIds.filter((pid) => state.potions[pid]?.state === PS.FULL).length ?? 0;
  const spells = state.availableSpells.filter((spellId) => !HIDDEN_SPELLS.has(spellId));

  return (
    <section className="va-panel panel-spells">
      <div className="panel-head">
        <svg className="panel-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.35">
          <circle cx="12" cy="12" r="8.5" />
          <circle cx="12" cy="12" r="5" strokeDasharray="2 2" />
          <path d="m9 13 3-5 3 5-3 2Z" />
        </svg>
        <span className="panel-title">法术符文</span>
        <span className="panel-meta">
          剩余 <strong>{Math.max(0, remaining)}</strong> 次 · 满瓶 {fullPotions}
        </span>
      </div>
      <div className="spell-list">
        {spells.map((spellId, index) => {
          const cost = SPELL_POTION_COST[spellId] ?? 1;
          const ready = remaining > 0 && fullPotions >= cost && !disabled;
          return (
            <button
              key={spellId}
              type="button"
              className={`spell-row ${ready ? 'is-ready' : 'is-muted'}`}
              disabled={!ready}
              onClick={() => onCastSpell(spellId)}
              title={`${SPELL_ZH_DESC[spellId] ?? ''}（消耗 ${cost} 满瓶）`}
            >
              <RuneMedallion index={index} muted={!ready} />
              <span className="spell-copy">
                <span className="spell-title">
                  {SPELL_ZH_NAME[spellId] ?? spellId}
                  <span className="spell-cost">消耗 {cost}</span>
                </span>
                <span className="spell-desc">{SPELL_ZH_DESC[spellId] ?? ''}</span>
              </span>
              <span className="spell-ready" />
            </button>
          );
        })}
      </div>
    </section>
  );
}

function RuneMedallion({ index, muted }: { index: number; muted: boolean }) {
  const glyphs = [
    'M12 4v16M6 9l12 6M18 9 6 15',
    'M4 16 12 5l8 11Z',
    'M12 3v18M5 8h14M5 16h14',
    'M6 6h12v12H6Z',
  ];
  return (
    <span className="rune-medallion">
      <svg viewBox="0 0 44 44" aria-hidden="true" style={{ filter: muted ? 'saturate(0.4) brightness(0.85)' : undefined }}>
        <defs>
          <radialGradient id={`rune-bg-${index}`} cx="35%" cy="28%" r="80%">
            <stop stopColor="#e9f1d8" />
            <stop offset="0.6" stopColor="#c2d3b1" />
            <stop offset="1" stopColor="#8fa888" />
          </radialGradient>
        </defs>
        <circle cx="22" cy="22" r="20" fill="#8b7a55" />
        <circle cx="22" cy="22" r="18" fill={`url(#rune-bg-${index})`} stroke="#e6d49a" strokeWidth="1.2" />
        <circle cx="22" cy="22" r="14.5" fill="none" stroke="rgba(94,124,98,0.55)" strokeWidth="0.8" strokeDasharray="2 3" />
        <path d={glyphs[index % glyphs.length] as string} stroke="#3f6354" strokeWidth="1.6" strokeLinecap="round" fill="none" />
      </svg>
    </span>
  );
}

/* ---------------- 结束回合 ---------------- */
export function EndTurnButton({ onClick }: { onClick: () => void }) {
  return (
    <button className="end-turn" type="button" onClick={onClick} title="结束本回合（补牌并轮转到下一玩家）">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
        <path d="M5 12h14m-5-5 5 5-5 5" />
      </svg>
      结束回合
    </button>
  );
}
