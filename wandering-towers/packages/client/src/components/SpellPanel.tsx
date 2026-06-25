import type { GameState, PlayerID, SpellID } from '@wt/shared';
import { SPELL_ZH_NAME } from '../game/config';

interface SpellPanelProps {
  state: GameState;
  playerId: PlayerID;
  onCastSpell: (spellId: SpellID) => void;
}

/** 法术施放面板：列出可用法术 + 费用 + 施法次数 */
export function SpellPanel({ state, playerId, onCastSpell }: SpellPanelProps) {
  const player = state.players[playerId];
  const maxSpells = state.config.spellSetup.maxSpellsPerTurn;
  const remaining = (maxSpells ?? 0) - (player?.spellsCastThisTurn ?? 0);
  const fullPotions = player?.potionIds.filter((pid) => state.potions[pid]?.state === 'FULL').length ?? 0;

  return (
    <div style={{ border: '1px solid #8e44ad', borderRadius: 8, padding: 8, background: '#f4ecf7' }}>
      <div style={{ fontWeight: 'bold', marginBottom: 4 }}>
        🪄 法术（本回合剩余 {remaining} 次 · 满瓶 {fullPotions}）
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
        {state.availableSpells.map((spellId) => {
          const cost = 1; // 标准版所有法术费用均为 1
          const canCast = remaining > 0 && fullPotions >= cost;
          return (
            <button
              key={spellId}
              onClick={() => onCastSpell(spellId)}
              disabled={!canCast}
              title={`费用 ${cost} 满瓶`}
              style={{
                padding: '4px 8px',
                cursor: canCast ? 'pointer' : 'not-allowed',
                opacity: canCast ? 1 : 0.5,
                background: canCast ? '#9b59b6' : '#ccc',
                color: '#fff',
                border: 'none',
                borderRadius: 4,
              }}
            >
              {SPELL_ZH_NAME[spellId] ?? spellId}
            </button>
          );
        })}
      </div>
    </div>
  );
}
