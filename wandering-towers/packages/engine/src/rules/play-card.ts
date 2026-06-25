import type {
  ActionCommand,
  GameEvent,
  GameState,
  MovementCardDefinition,
  PlayCardDecision,
  PlayerID,
  TowerID,
  WizardID,
} from '@wt/shared';
import { RuleErrorCode, MovementCardType, TurnPhase } from '@wt/shared';
import { RuleError } from '../rule-error';
import { TEMPLATE_BY_ID } from '@wt/shared';
import { moveWizardExact, isOwnVisibleWizard } from './move-wizard';
import { advanceOrEndTurn, type ActionOutcome } from './turn-flow';
import { moveTowerSegment } from './move-tower';
import { advanceRavenCastleAfterWizardEntered } from './raven-castle';
import { checkEndgameTrigger } from './endgame'; // Will be used in later tasks

/**
 * playMovementCard（V4 §14.3 / V2 规则 §6-13）
 *
 * 流程（保持 V4 §14.3 语义顺序）：
 *  1. 校验：当前玩家 / 阶段允许 / 牌在手
 *  2. 解析牌模板与移动值（FIXED / DICE）
 *  3. 判定模式（巫师/塔/二选一）
 *  4. 弃牌 + 发 CARD_PLAYED
 *  5. 巫师模式 -> moveWizardExact；塔模式 -> moveTowerSegment
 *  6. 进堡 -> 城堡移动 + 立即结束回合
 *  7. 否则推进 phase（ACTION_1 -> ACTION_2 -> TURN_END）
 *
 * 返回 { endTurn, endgameTriggered } 给引擎层做回合清理。
 *
 * 关于 emit：play-card 直接操作 state + 经 emit 推事件到累加器，
 * 回合清理（补牌/轮转）由 rule-engine 在 endTurn 时统一调用 endTurnCleanup。
 */

export function playMovementCard(
  state: GameState,
  command: ActionCommand,
  emit: (type: GameEvent['type'], payload: unknown) => GameEvent,
): ActionOutcome {
  const playerId = command.playerId;
  assertCurrentPlayer(state, playerId);
  assertActionPhase(state);

  const decision = command.payload as PlayCardDecision;
  if (command.type !== 'PLAY_CARD') {
    throw new RuleError(RuleErrorCode.INVALID_PHASE, `expected PLAY_CARD, got ${command.type}`);
  }

  const player = state.players[playerId]!;
  if (!player.hand.includes(decision.cardId)) {
    throw new RuleError(RuleErrorCode.CARD_NOT_IN_HAND, `card ${decision.cardId} not in hand`);
  }

  // 2. 解析牌模板与移动值
  const cardInstance = lookupCardInstance(state, decision.cardId);
  const tmpl = TEMPLATE_BY_ID[cardInstance.templateId];
  if (!tmpl) {
    throw new RuleError(RuleErrorCode.CARD_NOT_IN_HAND, `unknown template ${cardInstance.templateId}`);
  }
  const moveValue = resolveMoveValue(tmpl, decision);

  // 3. 判定模式
  const mode = resolveMode(tmpl, decision);

  // 4. 弃牌 + 发 CARD_PLAYED
  emit('CARD_DISCARDED', {
    playerId,
    cardId: decision.cardId,
    templateId: tmpl.templateId,
  });
  emit('CARD_PLAYED', {
    playerId,
    cardId: decision.cardId,
    templateId: tmpl.templateId,
    chosenMode: mode,
    resolvedMoveValue: moveValue,
  });

  let enteredCastle = false;

  // 6. 巫师模式
  if (mode === 'WIZARD') {
    const wizardId = decision.wizardId;
    if (!wizardId) {
      // 未指定目标巫师：若该玩家无任何合法目标 -> 行动消耗，无效果（V2 §20.1）
      if (!hasOwnVisibleWizard(state, playerId)) {
        return advanceOrEndTurn(state, emit);
      }
      throw new RuleError(RuleErrorCode.INVALID_WIZARD_TARGET, 'wizardId required for WIZARD mode');
    }
    if (!isOwnVisibleWizard(state, playerId, wizardId)) {
      // 非法目标：但若是因为无合法目标，行动仍消耗（V2 §20.1）
      // 此处区分：玩家指定了一个不可移动的巫师 -> 视为无合法目标，行动消耗
      return advanceOrEndTurn(state, emit);
    }
    try {
      const result = moveWizardExact(state, playerId, wizardId, moveValue, 'MOVEMENT_CARD', {}, emit);
      enteredCastle = result.enteredCastle;
    } catch (e) {
      // 落点非法（如容量超限）-> 行动消耗（V2 §20.1）
      if (isWizardIllegalTarget(e)) {
        return advanceOrEndTurn(state, emit);
      }
      throw e;
    }
  } else {
    // 塔模式
    const { towerSourceSpaceIndex, pickedTowerId } = decision;
    if (towerSourceSpaceIndex == null || !pickedTowerId) {
      // 未指定塔目标：若全场无任何塔可移动 -> 行动消耗
      if (!hasAnyTower(state)) {
        return advanceOrEndTurn(state, emit);
      }
      throw new RuleError(RuleErrorCode.INVALID_TOWER_TARGET, 'tower target required for TOWER mode');
    }
    try {
      const towerResult = moveTowerSegment(
        state,
        playerId,
        towerSourceSpaceIndex,
        pickedTowerId,
        moveValue,
        'MOVEMENT_CARD',
        emit,
      );
      // 封印奖励 1 瓶
      if (towerResult.imprisonmentHappened) {
        maybeFillOnePotionForImprisonment(state, playerId, emit);
      }
    } catch (e) {
      // 落点非法（如压堡）且玩家无法移动 -> 行动消耗（V2 §20.1）
      if (isTowerIllegalTarget(e)) {
        return advanceOrEndTurn(state, emit);
      }
      throw e;
    }
  }

  // 6.3-6.4 进堡 -> 城堡移动 + 立即结束回合
  if (enteredCastle) {
    advanceRavenCastleAfterWizardEntered(state, emit);
    // 终局检查（进堡可能达成终局）
    const triggered = checkEndgameTrigger(state, playerId, emit);
    return { endTurn: true, endgameTriggered: triggered };
  }

  return advanceOrEndTurn(state, emit);
}

/* ----------------------------- 校验与工具 ----------------------------- */

function assertCurrentPlayer(state: GameState, playerId: PlayerID): void {
  if (state.currentPlayerId !== playerId) {
    throw new RuleError(RuleErrorCode.NOT_CURRENT_PLAYER, `current=${state.currentPlayerId}, got=${playerId}`);
  }
}

function assertActionPhase(state: GameState): void {
  if (state.turnPhase !== TurnPhase.ACTION_1 && state.turnPhase !== TurnPhase.ACTION_2) {
    throw new RuleError(RuleErrorCode.INVALID_PHASE, `cannot play card in phase ${state.turnPhase}`);
  }
}

interface CardInstanceLookup {
  templateId: string;
}

/** 从牌堆/手牌/弃牌堆反查牌实例的 templateId */
function lookupCardInstance(state: GameState, cardId: string): CardInstanceLookup {
  // 牌实例的 templateId 不在 state 中显式存储（只有 ID）。
  // 需要一个 templateId 映射。这里通过 cardId 前缀反查不可靠，
  // 故在 state 上挂一个 _cardTemplates 映射（由 state-builder 维护）。
  // 见 state-builder 中的 cardTemplateMap。
  const map = (state as unknown as { _cardTemplates?: Record<string, string> })._cardTemplates;
  const templateId = map?.[cardId];
  if (!templateId) {
    throw new RuleError(RuleErrorCode.CARD_NOT_IN_HAND, `no template for card ${cardId}`);
  }
  return { templateId };
}

function resolveMoveValue(tmpl: MovementCardDefinition, decision: PlayCardDecision): number {
  if (tmpl.moveValueMode === 'FIXED') {
    return tmpl.fixedValue ?? 0;
  }
  // DICE：客户端传 resolvedMoveValue，或服务端掷骰（这里取客户端传入，引擎层校验范围）
  const v = decision.resolvedMoveValue;
  if (v == null || v < 1 || v > 6) {
    throw new RuleError(RuleErrorCode.INVALID_MOVE_VALUE, `dice result invalid: ${v}`);
  }
  return v;
}

function resolveMode(
  tmpl: MovementCardDefinition,
  decision: PlayCardDecision,
): 'WIZARD' | 'TOWER' {
  if (tmpl.type === MovementCardType.MOVE_WIZARD) return 'WIZARD';
  if (tmpl.type === MovementCardType.MOVE_TOWER) return 'TOWER';
  // MOVE_WIZARD_OR_TOWER
  if (decision.chosenMode !== 'WIZARD' && decision.chosenMode !== 'TOWER') {
    throw new RuleError(RuleErrorCode.INVALID_PHASE, 'chosenMode required for OR card');
  }
  return decision.chosenMode;
}

function hasOwnVisibleWizard(state: GameState, playerId: PlayerID): boolean {
  return Object.values(state.wizards).some(
    (w) =>
      w.ownerPlayerId === playerId &&
      (w.state.mode === 'ON_GROUND' || w.state.mode === 'ON_TOWER_TOP'),
  );
}

function isWizardIllegalTarget(e: unknown): boolean {
  if (!(e instanceof RuleError)) return false;
  return (
    e.code === RuleErrorCode.INVALID_WIZARD_TARGET ||
    e.code === RuleErrorCode.TARGET_CAPACITY_EXCEEDED ||
    e.code === RuleErrorCode.INVALID_MOVE_VALUE
  );
}

function hasAnyTower(state: GameState): boolean {
  return state.board.spaces.some((s) => s.towerStack.length > 0);
}

function isTowerIllegalTarget(e: unknown): boolean {
  if (!(e instanceof RuleError)) return false;
  return (
    e.code === RuleErrorCode.TOWER_CANNOT_LAND_ON_CASTLE ||
    e.code === RuleErrorCode.INVALID_TOWER_TARGET ||
    e.code === RuleErrorCode.TARGET_CAPACITY_EXCEEDED
  );
}

/** 封印奖励：恰好翻 1 个 EMPTY -> FULL（V2 §14.2 / §23.2） */
function maybeFillOnePotionForImprisonment(
  state: GameState,
  playerId: PlayerID,
  emit: (type: GameEvent['type'], payload: unknown) => GameEvent,
): void {
  const player = state.players[playerId];
  if (!player) return;
  const emptyPotionId = player.potionIds.find((pid) => state.potions[pid]?.state === 'EMPTY');
  if (!emptyPotionId) return; // 无空瓶 -> 不奖励
  emit('POTION_FILLED', {
    playerId,
    potionId: emptyPotionId,
    from: 'EMPTY',
    to: 'FULL',
    reason: 'IMPRISONMENT_REWARD',
  });
}

export type { GameEvent, WizardID, TowerID };
