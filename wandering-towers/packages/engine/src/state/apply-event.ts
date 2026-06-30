import type {
  GameEvent,
  GameState,
  PlayerID,
  CardID,
  TowerID,
  WizardID,
  WizardState,
  TurnPhase,
  SpaceIndex,
} from '@wt/shared';
import { WizardStateType } from '@wt/shared';

/**
 * Applies a single game event to the game state.
 * This function is the ONLY place where the game state is mutated.
 * It is designed to be a pure function of (state, event) -> void.
 *
 * @param state The game state to mutate.
 * @param event The event to apply.
 */
export function applyEvent(state: GameState, event: GameEvent): void {
  switch (event.type) {
    // --- Initialization ---
    case 'INIT_COMPLETED':
      // No state change, just a marker event for the log.
      return;

    // --- Turn Flow & Phase Management ---
    case 'ACTION_PHASE_CHANGED': {
      const { to } = event.payload as { to: TurnPhase };
      state.turnPhase = to;
      return;
    }
    case 'PLAYER_TURN_STATS_RESET': {
      const { playerId } = event.payload as { playerId: PlayerID };
      const player = state.players[playerId];
      if (player) {
        player.spellsCastThisTurn = 0;
      }
      return;
    }
    case 'TURN_STARTED': {
      const { playerId, roundNumber } = event.payload as { playerId: PlayerID; roundNumber: number };
      state.currentPlayerId = playerId;
      state.roundNumber = roundNumber;
      return;
    }
    case 'TURN_ENDED': // Marker event
    case 'ROUND_ENDED': // Marker event
      return;

    // --- Card Management ---
    case 'CARDS_DRAWN': {
      const { playerId, cardIds } = event.payload as { playerId: PlayerID; cardIds: CardID[] };
      const player = state.players[playerId];
      if (player) {
        // Remove cards from draw pile. We assume they are at the end.
        const drawCount = cardIds.length;
        if (state.drawPile.length >= drawCount) {
          state.drawPile.splice(state.drawPile.length - drawCount, drawCount);
        }
        player.hand.push(...cardIds);
      }
      return;
    }
    case 'CARD_DISCARDED': {
      const { playerId, cardId } = event.payload as { playerId: PlayerID; cardId: CardID };
      const player = state.players[playerId];
      if (player) {
        const i = player.hand.indexOf(cardId);
        if (i >= 0) {
          player.hand.splice(i, 1);
        }
      }
      state.discardPile.push(cardId);
      return;
    }
    case 'DISCARD_PILE_RESHUFFLED': {
      // The reshuffle logic is deterministic (reverse) to ensure replayability
      state.drawPile.unshift(...[...state.discardPile].reverse());
      state.discardPile = [];
      return;
    }
    case 'CARD_PLAYED': // Marker event
      return;

    // --- Wizard Movement ---
    case 'WIZARD_MOVED': {
      const { wizardId, from, to } = event.payload as {
        wizardId: WizardID;
        from: WizardState;
        to: WizardState;
      };
      const wizard = state.wizards[wizardId];
      if (!wizard) return;

      // 1. Remove from source visible location
      if (from.mode === WizardStateType.ON_GROUND) {
        const space = state.board.spaces[from.spaceIndex];
        if (space) {
          const i = space.groundVisibleWizards.indexOf(wizardId);
          if (i > -1) {
            space.groundVisibleWizards.splice(i, 1);
          }
        }
      }

      // 2. Update wizard's core state
      wizard.state = to;

      // 3. Add to destination visible location (if applicable)
      if (to.mode === WizardStateType.ON_GROUND) {
        const space = state.board.spaces[to.spaceIndex];
        if (space && !space.groundVisibleWizards.includes(wizardId)) {
          space.groundVisibleWizards.push(wizardId);
        }
      }
      return;
    }
    case 'WIZARD_ENTERED_CASTLE': {
      const { wizardId } = event.payload as { wizardId: WizardID };
      if (!state.ravenCastle.wizardIdsInside.includes(wizardId)) {
        state.ravenCastle.wizardIdsInside.push(wizardId);
      }
      return;
    }

    // --- Tower Movement & Imprisonment ---
    case 'TOWER_SLICE_MOVED': {
      const { movedTowerIds, fromSpaceIndex, toSpaceIndex, wizardsOnTop } = event.payload as {
        movedTowerIds: TowerID[];
        fromSpaceIndex: SpaceIndex;
        toSpaceIndex: SpaceIndex;
        wizardsOnTop: WizardID[];
      };

      const sourceSpace = state.board.spaces[fromSpaceIndex];
      if (sourceSpace) {
        sourceSpace.towerStack = sourceSpace.towerStack.filter((tid) => !movedTowerIds.includes(tid));
      }

      const destSpace = state.board.spaces[toSpaceIndex];
      if (destSpace) {
        destSpace.towerStack.push(...movedTowerIds);
      }

      for (const wizardId of wizardsOnTop) {
        const wizard = state.wizards[wizardId];
        if (wizard?.state.mode === WizardStateType.ON_TOWER_TOP) {
          wizard.state.spaceIndex = toSpaceIndex;
        }
      }

      for (const towerId of movedTowerIds) {
        const tower = state.towers[towerId];
        if (tower) {
          for (const wizardId of tower.imprisonedWizards) {
            const wizard = state.wizards[wizardId];
            if (wizard?.state.mode === WizardStateType.IMPRISONED) {
              wizard.state.spaceIndex = toSpaceIndex;
            }
          }
        }
      }
      return;
    }
    case 'WIZARD_IMPRISONED': {
      const { wizardId, insideTowerId, spaceIndex, sealedAs } = event.payload as {
        wizardId: WizardID;
        insideTowerId: TowerID;
        spaceIndex: SpaceIndex;
        sealedAs: 'COVERED_TOWER' | 'GROUND';
      };
      const wizard = state.wizards[wizardId];
      const tower = state.towers[insideTowerId];
      if (!wizard || !tower) return;

      const fromState = wizard.state;
      if (fromState.mode === WizardStateType.ON_GROUND) {
        const space = state.board.spaces[fromState.spaceIndex];
        if (space) {
          const i = space.groundVisibleWizards.indexOf(wizardId);
          if (i > -1) space.groundVisibleWizards.splice(i, 1);
        }
      } else if (fromState.mode === WizardStateType.ON_TOWER_TOP) {
        // Model B：塔顶巫师被封进其原本站立的（被覆盖）塔，无需改 groundVisibleWizards
        // （塔顶巫师不在 groundVisibleWizards 中，由 ON_TOWER_TOP 状态表达）。
      }

      wizard.state = { mode: WizardStateType.IMPRISONED, spaceIndex, insideTowerId, sealedAs };
      if (!tower.imprisonedWizards.includes(wizardId)) {
        tower.imprisonedWizards.push(wizardId);
      }
      return;
    }
    case 'WIZARD_RELEASED': {
      // 解封：从原封印塔的登记中移除，并把巫师置为 `to` 状态。
      // 必须在 applyEvent 实装（而非规则函数直接 mutate），否则纯事件回放
      // 无法复现解封，破坏 TC-REPLAY-001 一致性。
      const { wizardId, to } = event.payload as { wizardId: WizardID; to: WizardState };
      const wizard = state.wizards[wizardId];
      if (!wizard) return;
      // 从原封印塔的 imprisonedWizards 列表移除（若仍处于 IMPRISONED）
      if (wizard.state.mode === WizardStateType.IMPRISONED) {
        const oldTower = state.towers[wizard.state.insideTowerId];
        if (oldTower) {
          const i = oldTower.imprisonedWizards.indexOf(wizardId);
          if (i > -1) oldTower.imprisonedWizards.splice(i, 1);
        }
      }
      wizard.state = to;
      // 解封到地面需登记到该空间 groundVisibleWizards
      if (to.mode === WizardStateType.ON_GROUND) {
        const sp = state.board.spaces[to.spaceIndex];
        if (sp && !sp.groundVisibleWizards.includes(wizardId)) {
          sp.groundVisibleWizards.push(wizardId);
        }
      }
      return;
    }

    // --- Castle Movement ---
    case 'RAVEN_CASTLE_MOVED': {
      const { to } = event.payload as { to: GameState['ravenCastle']['position'] };
      state.ravenCastle.position = to;
      return;
    }

    // --- Events for Later Phases ---
    case 'POTION_FILLED': {
      const { potionId } = event.payload as { potionId: string };
      const potion = state.potions[potionId];
      if (potion && potion.state === 'EMPTY') {
        potion.state = 'FULL';
      }
      return;
    }
    case 'POTION_SPENT': {
      const { potionIds } = event.payload as { potionIds: string[] };
      for (const potionId of potionIds) {
        const potion = state.potions[potionId];
        if (potion && potion.state === 'FULL') {
          potion.state = 'SPENT';
        }
      }
      return;
    }
    case 'SPELL_CAST':
    case 'SPELL_EFFECT_APPLIED':
      return;
    case 'TOWER_SEALED': {
      const { towerId } = event.payload as { towerId: TowerID };
      const tower = state.towers[towerId];
      if (tower) {
        tower.sealed = true;
      }
      return;
    }
    case 'TOWER_UNSEALED': {
      const { towerId } = event.payload as { towerId: TowerID };
      const tower = state.towers[towerId];
      if (tower) {
        tower.sealed = false;
      }
      return;
    }
    case 'ENDGAME_TRIGGERED': {
      const p = event.payload as { playerId: PlayerID; roundNumber: number };
      state.endgameTriggered = true;
      state.endgameTriggerPlayerId = p.playerId;
      state.endgameTriggerRound = p.roundNumber;
      return;
    }
    case 'GAME_ENDED': {
      const p = event.payload as {
        winners: PlayerID[];
        scores: Record<PlayerID, number>;
        shared: boolean;
      };
      state.winners = p.winners;
      state.scores = p.scores;
      state.sharedVictory = p.shared;
      state.turnPhase = 'GAME_FINISHED';
      return;
    }

    // 标记类事件（暂无状态副作用，仅用于日志/回放）
    case 'DISCARD_RESHUFFLED_TO_DRAW':
    case 'TOWER_STACK_REBUILT':
    case 'WINNER_DETERMINED':
      return;

    default: {
      const _exhaustiveCheck: never = event.type;
      return _exhaustiveCheck;
    }
  }
}

/** 批量应用事件序列 */
export function applyEvents(state: GameState, events: GameEvent[]): void {
  for (const e of events) applyEvent(state, e);
}
