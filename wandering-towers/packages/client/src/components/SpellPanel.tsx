import type { GameState, PlayerID, SpellID } from '@wt/shared';
import { SPELL_ZH_DESC, SPELL_ZH_NAME, SPELL_POTION_COST } from '../game/config';

interface SpellPanelProps {
  state: GameState;
  playerId: PlayerID;
  onCastSpell: (spellId: SpellID) => void;
}

/** 法术施放面板（简洁按钮样式）
 * 用途说明 + 消耗药水数 + 可用状态 */
export function SpellPanel({ state, playerId, onCastSpell }: SpellPanelProps) {
  const player = state.players[playerId];
  const maxSpells = state.config.spellSetup.maxSpellsPerTurn;
  const remaining = (maxSpells ?? 0) - (player?.spellsCastThisTurn ?? 0);
  const fullPotions = player?.potionIds.filter((pid) => state.potions[pid]?.state === 'FULL').length ?? 0;

  return (
    <div style={{ border: '1px solid #8e44ad', borderRadius: 6, padding: 6, background: 'rgba(20,22,28,0.92)', color: '#f4ead1' }}>
      <div style={{ fontWeight: 'bold', marginBottom: 4, fontSize: 12 }}>
        法术（剩余 {remaining} 次 · 满瓶 {fullPotions}）
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        {state.availableSpells.map((spellId) => {
          const cost = SPELL_POTION_COST[spellId] ?? 1;
          const canCast = remaining > 0 && fullPotions >= cost;
          return (
            <button
              key={spellId}
              onClick={() => onCastSpell(spellId)}
              disabled={!canCast}
              title={`消耗 ${cost} 满瓶`}
              style={{
                padding: '4px 8px',
                cursor: canCast ? 'pointer' : 'not-allowed',
                opacity: canCast ? 1 : 0.5,
                background: canCast ? '#9b59b6' : '#888',
                color: '#fff',
                border: 'none',
                borderRadius: 4,
                textAlign: 'left',
                fontSize: 11,
                boxShadow: '0 1px 2px rgba(0,0,0,0.2)',
              }}
            >
              <span style={{ fontWeight: 'bold' }}>
                {SPELL_ZH_NAME[spellId] ?? spellId}
                <span style={{ float: 'right', fontWeight: 'normal' }}>消耗{cost}</span>
              </span>
              <span style={{ fontSize: 9, opacity: 0.85 }}>{SPELL_ZH_DESC[spellId] ?? ''}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
