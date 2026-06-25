import type { ActionCommand, GameEvent, GameState, PlayerID, SpellID } from '@wt/shared';
import { RuleErrorCode, TurnPhase } from '@wt/shared';
import { RuleError } from '../rule-error';
import { potionsByState } from '../state/selectors';
import { getSpell } from './spell-registry';
import type { SpellCastContext } from './spell';
import { advanceRavenCastleAfterWizardEntered } from '../rules/raven-castle';
import { checkEndgameTrigger } from '../rules/endgame';

/**
 * castSpell 主流程（V4 §14.9）
 *
 * 1. 校验：当前玩家 / 时机 / 法术在局 / 施法上限 / 满瓶足够 / 目标规则
 * 2. 扣药水：取 cost 个 FULL → emit POTION_SPENT → state FULL→SPENT
 * 3. emit SPELL_CAST；player.spellsCastThisTurn++
 * 4. 委托 ISpell.resolve（复用基础规则函数）
 * 5. 法术致进堡 → advanceRavenCastleAfterWizardEntered + checkEndgameTrigger → turnEnds
 *
 * 返回 { turnEnds, endgameTriggered } 给 rule-engine 做回合清理。
 */

export interface CastSpellResult {
  turnEnds: boolean;
  endgameTriggered: boolean;
}

export function castSpell(
  state: GameState,
  command: ActionCommand,
  emit: (type: GameEvent['type'], payload: unknown) => GameEvent,
): CastSpellResult {
  if (command.type !== 'CAST_SPELL') {
    throw new RuleError(RuleErrorCode.INVALID_PHASE, `expected CAST_SPELL, got ${command.type}`);
  }
  const playerId: PlayerID = command.playerId;

  // 1.1 当前玩家
  if (state.currentPlayerId !== playerId) {
    throw new RuleError(RuleErrorCode.NOT_CURRENT_PLAYER, `current=${state.currentPlayerId}, got ${playerId}`);
  }
  // 1.2 时机：ACTIVE_ONLY，行动阶段可施法（V4 §13.5 BEFORE_DURING_AFTER_ACTION + V2 §17.2）
  if (state.turnPhase !== TurnPhase.ACTION_1 && state.turnPhase !== TurnPhase.ACTION_2) {
    throw new RuleError(RuleErrorCode.INVALID_PHASE, `不能在 ${state.turnPhase} 阶段施法`);
  }

  const payload = command.payload as { spellId: SpellID; targetDecision: unknown };
  const spellId = payload.spellId;
  const player = state.players[playerId];
  if (!player) {
    throw new RuleError(RuleErrorCode.NOT_CURRENT_PLAYER, `玩家不存在: ${playerId}`);
  }

  // 1.3 法术在本局 availableSpells
  if (!state.availableSpells.includes(spellId)) {
    throw new RuleError(RuleErrorCode.INVALID_SPELL, `法术 ${spellId} 不在本局`);
  }

  // 1.4 施法次数上限
  if (player.spellsCastThisTurn >= state.config.spellSetup.maxSpellsPerTurn) {
    throw new RuleError(RuleErrorCode.SPELL_LIMIT_REACHED);
  }

  const spell = getSpell(spellId);
  if (!spell) {
    throw new RuleError(RuleErrorCode.INVALID_SPELL, `未注册法术: ${spellId}`);
  }

  const ctx: SpellCastContext = {
    state,
    player,
    payload: payload as SpellCastContext['payload'],
    emit,
  };

  // 1.5 目标规则校验（委托法术 canCast）
  spell.canCast(ctx);

  // 2. 扣药水
  const cost = spell.definition.cost_full_potions;
  const fullPotionIds = potionsByState(state, playerId, 'FULL');
  if (fullPotionIds.length < cost) {
    throw new RuleError(RuleErrorCode.NOT_ENOUGH_FULL_POTIONS);
  }
  const potionIdsToSpend = fullPotionIds.slice(0, cost);
  // 先改 state（FULL→SPENT），再 emit POTION_SPENT（apply-event 会再次确认状态）
  for (const pid of potionIdsToSpend) {
    const potion = state.potions[pid];
    if (potion && potion.state === 'FULL') {
      potion.state = 'SPENT';
    }
  }
  emit('POTION_SPENT', { playerId, spellId, potionIds: potionIdsToSpend });

  // 3. emit SPELL_CAST + 计数
  emit('SPELL_CAST', { playerId, spellId, targetDecision: payload.targetDecision });
  player.spellsCastThisTurn += 1;

  // 4. 委托 resolve
  const result = spell.resolve(ctx);

  // 5. 法术致进堡 → 城堡移动 + 终局检查 + 回合结束
  if (result.enteredCastle) {
    advanceRavenCastleAfterWizardEntered(state, emit);
    const triggered = checkEndgameTrigger(state, playerId, emit);
    return { turnEnds: true, endgameTriggered: triggered };
  }

  return { turnEnds: false, endgameTriggered: false };
}
