import type { ActionCommand, GameEvent, GameState } from '@wt/shared';
import { RuleErrorCode } from '@wt/shared';
import { RuleError } from '../rule-error';
import { allWizardsInCastle, potionsByState } from '../state/selectors';
import { advanceOrEndTurn, type ActionOutcome } from './turn-flow';

/**
 * 主动填充一个药水瓶
 *
 * 这是一个特殊行动，只有在满足特定条件时才能执行。
 *
 * 校验 (V2 规则 "魔法瓶"):
 *  - 玩家必须所有巫师都在城堡内
 *  - 玩家至少有一个 EMPTY 药水瓶
 *  - 这是一个行动，会消耗行动点
 */
export function fillPotion(
  state: GameState,
  command: ActionCommand,
  emit: (type: GameEvent['type'], payload: unknown) => GameEvent,
): ActionOutcome {
  const playerId = command.playerId;

  // 校验是否满足填充条件
  if (!allWizardsInCastle(state, playerId)) {
    throw new RuleError(
      RuleErrorCode.FILL_POTION_CONDITION_NOT_MET,
      `Player ${playerId} cannot fill potion as not all wizards are in the castle.`,
    );
  }

  // 校验并找到一个空瓶
  const emptyPotions = potionsByState(state, playerId, 'EMPTY');
  if (emptyPotions.length === 0) {
    throw new RuleError(RuleErrorCode.NO_EMPTY_POTION, `Player ${playerId} has no empty potions to fill.`);
  }
  const potionToFill = emptyPotions[0]!;

  emit('POTION_FILLED', {
    potionId: potionToFill,
    playerId,
    reason: 'MANUAL_FILL',
  });

  // 填充药水算作一次行动
  return advanceOrEndTurn(state, emit);
}