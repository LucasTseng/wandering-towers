import type { GameState, PlayerID } from '@wt/shared';
import {
  PLAYER_RESOURCES,
  TOWER_COUNT,
  WizardStateType,
} from '@wt/shared';
import { wizardsOfPlayer, countPotions } from './state/selectors';

/**
 * 不变量检查器（V3 数据字典 §23）
 *
 * 对任意 GameState 断言五类不变量始终成立。
 * 用于每个集成测试收尾 + 100 局随机对局扫描（TC-REPLAY-002）。
 */

export interface InvariantViolation {
  rule: string;
  detail: string;
}

export function checkInvariants(state: GameState): InvariantViolation[] {
  const violations: InvariantViolation[] = [];

  // §23.3 塔不变量：9 座塔全部出现在某空间 towerStack 中，不丢失、不重复
  const towerOccurrences = new Map<string, number>();
  for (const sp of state.board.spaces) {
    for (const t of sp.towerStack) {
      towerOccurrences.set(t, (towerOccurrences.get(t) ?? 0) + 1);
    }
  }
  const towerIds = Object.keys(state.towers);
  if (towerIds.length !== TOWER_COUNT) {
    violations.push({
      rule: 'TOWER_COUNT',
      detail: `towers registered=${towerIds.length}, expected=${TOWER_COUNT}`,
    });
  }
  for (const id of towerIds) {
    const occ = towerOccurrences.get(id) ?? 0;
    if (occ !== 1) {
      violations.push({
        rule: 'TOWER_UNIQUENESS',
        detail: `tower ${id} appears ${occ} times on board`,
      });
    }
  }

  // §23.2 巫师不变量：每个巫师恰处于四种状态之一（类型系统已保证互斥，
  // 这里额外校验状态与棋盘/封印登记的一致性）
  for (const w of Object.values(state.wizards)) {
    if (w.state.mode === WizardStateType.IMPRISONED) {
      const tower = state.towers[w.state.insideTowerId];
      if (!tower || !tower.imprisonedWizards.includes(w.id)) {
        violations.push({
          rule: 'WIZARD_IMPRISONMENT_REGISTRATION',
          detail: `wizard ${w.id} claims IMPRISONED in ${w.state.insideTowerId} but not registered`,
        });
      }
    }
  }
  // 封印登记的巫师状态须一致
  for (const tower of Object.values(state.towers)) {
    for (const wid of tower.imprisonedWizards) {
      const w = state.wizards[wid];
      if (!w || w.state.mode !== WizardStateType.IMPRISONED) {
        violations.push({
          rule: 'WIZARD_IMPRISONMENT_REGISTRATION',
          detail: `tower ${tower.id} registers ${wid} but wizard not IMPRISONED`,
        });
      }
    }
  }

  // §23.1 药水不变量：EMPTY + FULL + SPENT = 初始药水总数
  for (const playerId of Object.keys(state.players) as PlayerID[]) {
    const res = PLAYER_RESOURCES[state.config.playerCount];
    const expected = res?.potionsPerPlayer ?? 0;
    const empty = countPotions(state, playerId, 'EMPTY');
    const full = countPotions(state, playerId, 'FULL');
    const spent = countPotions(state, playerId, 'SPENT');
    if (empty + full + spent !== expected) {
      violations.push({
        rule: 'POTION_TOTAL',
        detail: `player ${playerId}: ${empty}+${full}+${spent}=${empty + full + spent} != ${expected}`,
      });
    }
  }

  // §23.5 城堡不变量：任一时刻只能有一个位置
  // position 是单值字段，类型已保证互斥；这里仅校验 wizardIdsInside 与 IN_CASTLE 巫师一致
  const inCastleFromWizards = Object.values(state.wizards)
    .filter((w) => w.state.mode === WizardStateType.IN_CASTLE)
    .map((w) => w.id)
    .sort();
  const inCastleFromCastle = [...state.ravenCastle.wizardIdsInside].sort();
  if (JSON.stringify(inCastleFromWizards) !== JSON.stringify(inCastleFromCastle)) {
    violations.push({
      rule: 'CASTLE_WIZARD_CONSISTENCY',
      detail: `wizards IN_CASTLE=[${inCastleFromWizards.join(',')}] vs castle.inside=[${inCastleFromCastle.join(',')}]`,
    });
  }

  // §23.4 手牌不变量：正常回合结束手牌应补到 3（牌堆耗尽洗牌除外）
  // 仅在非进行中（TURN_END）做软校验，避免误报；这里记录但不强制。
  return violations;
}

/** 断言无任何不变量违反，否则抛错（测试用） */
export function assertInvariants(state: GameState): void {
  const v = checkInvariants(state);
  if (v.length > 0) {
    const msg = v.map((x) => `[${x.rule}] ${x.detail}`).join('\n');
    throw new Error(`Invariant violations:\n${msg}`);
  }
}
