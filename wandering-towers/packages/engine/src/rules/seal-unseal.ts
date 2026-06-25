import type { ActionCommand, GameEvent, GameState, PlayerID, TowerID } from '@wt/shared';
import { RuleErrorCode } from '@wt/shared';
import { RuleError } from '../rule-error';
import { isWizardOnTower } from '../state/selectors';
import { advanceOrEndTurn, type ActionOutcome } from './turn-flow';

/**
 * 封印一座塔
 *
 * 校验：
 *  - 玩家必须有巫师在该塔上（V2 §12.1）
 *  - 塔未被封印
 *  - 玩家需消耗一个满的药水
 */
export function sealTower(
  state: GameState,
  command: ActionCommand,
  emit: (type: GameEvent['type'], payload: unknown) => GameEvent,
): ActionOutcome {
  const playerId = command.playerId;
  const { towerId } = command.payload as { towerId: TowerID };

  const tower = state.towers[towerId];
  if (!tower) {
    throw new RuleError(RuleErrorCode.INVALID_TOWER_TARGET, `Tower ${towerId} not found.`);
  }
  if (tower.sealed) {
    throw new RuleError(RuleErrorCode.TOWER_ALREADY_SEALED, `Tower ${towerId} is already sealed.`);
  }

  // V2 §12.1: "指定一座自己巫师所在的塔"
  if (!isWizardOnTower(state, playerId, towerId)) {
    throw new RuleError(
      RuleErrorCode.PLAYER_HAS_NO_WIZARD_ON_TOWER,
      `Player ${playerId} has no wizard on tower ${towerId}.`,
    );
  }

  // 校验并消耗药水
  const fullPotions = state.players[playerId]!.potionIds.filter(
    (pid) => state.potions[pid]?.state === 'FULL',
  );
  if (fullPotions.length === 0) {
    throw new RuleError(RuleErrorCode.NO_FULL_POTION, `Player ${playerId} has no full potions to seal a tower.`);
  }
  const potionToSpend = fullPotions[0]!;

  emit('TOWER_SEALED', { towerId, sealedBy: playerId });
  emit('POTION_SPENT', { potionId: potionToSpend, spentBy: playerId, reason: 'SEAL_TOWER' });

  // 封印算作一次行动
  return advanceOrEndTurn(state, emit);
}

/**
 * 解封一座塔
 *
 * 校验：
 *  - 塔已被封印
 *  - 玩家需消耗一个满的药水
 */
export function unsealTower(
  state: GameState,
  command: ActionCommand,
  emit: (type: GameEvent['type'], payload: unknown) => GameEvent,
): ActionOutcome {
  const playerId = command.playerId;
  const { towerId } = command.payload as { towerId: TowerID };

  const tower = state.towers[towerId];
  if (!tower) {
    throw new RuleError(RuleErrorCode.INVALID_TOWER_TARGET, `Tower ${towerId} not found.`);
  }
  if (!tower.sealed) {
    throw new RuleError(RuleErrorCode.TOWER_NOT_SEALED, `Tower ${towerId} is not sealed.`);
  }

  // 校验并消耗药水
  const fullPotions = state.players[playerId]!.potionIds.filter(
    (pid) => state.potions[pid]?.state === 'FULL',
  );
  if (fullPotions.length === 0) {
    throw new RuleError(RuleErrorCode.NO_FULL_POTION, `Player ${playerId} has no full potions to unseal a tower.`);
  }
  const potionToSpend = fullPotions[0]!;

  emit('TOWER_UNSEALED', { towerId, unsealedBy: playerId });
  emit('POTION_SPENT', { potionId: potionToSpend, spentBy: playerId, reason: 'UNSEAL_TOWER' });

  // 解封算作一次行动
  return advanceOrEndTurn(state, emit);
}