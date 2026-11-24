import type { CSSProperties } from 'react';
import type { GameState, PlayerID, SpellID } from '@wt/shared';
import { SPELL_ZH_DESC, SPELL_ZH_NAME, SPELL_POTION_COST, HIDDEN_SPELLS } from '../game/config';
import { Prism3D } from './Prism3D';

interface SpellPanelProps {
  state: GameState;
  playerId: PlayerID;
  onCastSpell: (spellId: SpellID) => void;
}

/**
 * D03 法术符文槽 —— v2 真 3D：16 边圆盘石槽 Ø44 × h6（顶面 + 侧壁厚度），
 * 悬浮岛屿 / 飞鸟在正面层。与 3D-asset-stage.html 的 disc() 同源。
 * 禁用态降饱和只施加在圆盘叶子面与文字，不放在按钮（3D 上下文容器）上。
 */
export function SpellPanel({ state, playerId, onCastSpell }: SpellPanelProps) {
  const player = state.players[playerId];
  const maxSpells = state.config.spellSetup.maxSpellsPerTurn;
  const remaining = (maxSpells ?? 0) - (player?.spellsCastThisTurn ?? 0);
  const fullPotions = player?.potionIds.filter((pid) => state.potions[pid]?.state === 'FULL').length ?? 0;

  return (
    <div className="va-panel va-panel-thick" style={{ padding: 6 }}>
      <div className="va-panel-title">法术 · 剩余 {remaining} 次 · 满瓶 {fullPotions}</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
        {state.availableSpells
          .filter((spellId) => !HIDDEN_SPELLS.has(spellId))
          .map((spellId) => {
            const cost = SPELL_POTION_COST[spellId] ?? 1;
            const canCast = remaining > 0 && fullPotions >= cost;
            const dim: CSSProperties['filter'] = canCast ? undefined : 'saturate(0.3) brightness(0.72)';
            return (
              <button
                key={spellId}
                className="va-stone-button"
                onClick={() => onCastSpell(spellId)}
                disabled={!canCast}
                title={`消耗 ${cost} 满瓶`}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '3px 7px',
                  textAlign: 'left',
                  fontSize: 11,
                  cursor: canCast ? 'pointer' : 'not-allowed',
                  borderColor: canCast ? 'rgba(122,108,80,0.8)' : 'rgba(90,92,100,0.65)',
                }}
              >
                <span
                  className="va-ui-3d"
                  style={{ position: 'relative', display: 'block', width: 44, height: 44, flex: '0 0 auto' }}
                >
                  <Prism3D
                    sides={16}
                    radius={22}
                    height={6}
                    start={0}
                    topClassName="va-rune-slot"
                    topStyle={{ borderRadius: '50%', filter: dim }}
                    sideClassName="va-side-dark"
                    sideVars={() => ({ filter: dim } as CSSProperties)}
                    topChildren={
                      <>
                        <span className="va-rune-island" />
                        <span className="va-rune-bird" />
                      </>
                    }
                  />
                </span>
                <span style={{ display: 'flex', flexDirection: 'column', minWidth: 0, flex: 1, filter: dim }}>
                  <span style={{ fontWeight: 700, color: '#f5e9c8' }}>
                    {SPELL_ZH_NAME[spellId] ?? spellId}
                    <span style={{ float: 'right', fontWeight: 400, color: '#d9c9a3', fontSize: 10 }}>消耗 {cost}</span>
                  </span>
                  <span style={{ fontSize: 9, color: '#b8bcc6', lineHeight: 1.35 }}>
                    {SPELL_ZH_DESC[spellId] ?? ''}
                  </span>
                </span>
              </button>
            );
          })}
      </div>
    </div>
  );
}
