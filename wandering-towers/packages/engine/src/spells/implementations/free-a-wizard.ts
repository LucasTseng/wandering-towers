import type { SpellDefinition, WizardID, WizardState } from '@wt/shared';
import { SPELL_BY_ID, RuleErrorCode, WizardStateType } from '@wt/shared';
import { RuleError } from '../../rule-error';
import { topTowerAt, towerStackAt } from '../../state/selectors';
import type { ISpell, SpellCastContext, SpellResolveResult } from '../spell';

/**
 * FREE_A_WIZARD（V4 §13.6 Spell-03 / §13.7）
 *
 * 玩家不知道被封印的巫师藏在哪座塔下，因此本法术的目标是「点击一座塔」：
 *  - 玩家施法后点击地图上一座塔（任意塔，通常是某空间塔堆的顶层塔）。
 *  - 引擎检查该塔所在塔堆（自下而上所有塔）里，是否有**自己方**被封印的巫师。
 *    （「下面有被封印的自己方巫师」——巫师可能被封在该堆任意一层塔内，包括被覆盖的底层塔。）
 *  - 命中：解救该巫师，放到本塔堆最顶端（成为可见塔顶巫师），emit WIZARD_RELEASED。
 *  - 未命中（塔下无己方封印巫师 / 只有对方巫师 / 完全无封印）：法术仍生效、药水照扣，
 *    但解救失败、巫师不动（只有 1 次机会，不退药水）。
 *
 * 因此 canCast 只做最低校验（塔存在），「点错塔」不在此拦截——药水在 castSpell 主流程中
 * 已经扣除后才进入 resolve，resolve 内判定命中与否。
 *
 * 注意：本法术不"移动"巫师，只改状态 IMPRISONED -> ON_TOWER_TOP（同空间、塔堆顶层）。
 */
export const freeAWizard: ISpell = {
  definition: SPELL_BY_ID['FREE_A_WIZARD']! as SpellDefinition,

  canCast(ctx: SpellCastContext): void {
    const { state, payload } = ctx;
    const td = payload.targetDecision;
    const towerId = td?.pickedTowerId ?? null;
    if (!towerId) {
      throw new RuleError(RuleErrorCode.INVALID_SPELL_TARGET, 'pickedTowerId 必填（点击一座塔）');
    }
    const tower = state.towers[towerId];
    if (!tower) {
      throw new RuleError(RuleErrorCode.INVALID_SPELL_TARGET, `塔不存在: ${towerId}`);
    }
    // 若客户端同时给了 towerSourceSpaceIndex，校验该塔确实在此空间塔堆中（防误传）
    const srcSpace = td?.towerSourceSpaceIndex;
    if (srcSpace != null) {
      const stack = state.board.spaces[srcSpace]?.towerStack ?? [];
      if (!stack.includes(towerId)) {
        throw new RuleError(RuleErrorCode.INVALID_SPELL_TARGET, `塔 ${towerId} 不在空间 ${srcSpace}`);
      }
    }
    // 不校验 sealed / 是否有己方封印巫师：点错塔也应放行（药水照扣，resolve 内判命中）。
  },

  resolve(ctx: SpellCastContext): SpellResolveResult {
    const { state, player, payload, emit } = ctx;
    const td = payload.targetDecision!;
    const towerId = td.pickedTowerId!;
    const tower = state.towers[towerId]!;

    // 定位该塔所在空间：优先用客户端给的 towerSourceSpaceIndex，否则全表搜索。
    let spaceIndex: number | null = null;
    const srcSpace = td.towerSourceSpaceIndex;
    if (srcSpace != null && (state.board.spaces[srcSpace]?.towerStack ?? []).includes(towerId)) {
      spaceIndex = srcSpace;
    } else {
      for (const sp of state.board.spaces) {
        if (sp.towerStack.includes(towerId)) {
          spaceIndex = sp.index;
          break;
        }
      }
    }
    if (spaceIndex == null) {
      // 塔不在棋盘上（不应发生，canCast 已基本放行）：解救失败，药水已扣。
      return { enteredCastle: false };
    }

    // 在该空间塔堆（自下而上）里找第一个**自己方**被封印的巫师。
    const stack = towerStackAt(state, spaceIndex);
    let freedWizardId: WizardID | null = null;
    for (const tid of stack) {
      const t = state.towers[tid];
      if (!t) continue;
      for (const wid of t.imprisonedWizards) {
        const w = state.wizards[wid];
        if (w && w.ownerPlayerId === player.id && w.state.mode === WizardStateType.IMPRISONED) {
          freedWizardId = wid;
          break;
        }
      }
      if (freedWizardId) break;
    }

    if (!freedWizardId) {
      // 点错塔：塔堆下无己方封印巫师 -> 解救失败，药水已消耗，不动巫师。
      return { enteredCastle: false };
    }

    const wizard = state.wizards[freedWizardId]!;
    // freedWizardId 仅在 w.state.mode === IMPRISONED 时被选中，安全收窄类型
    const imprisoned = wizard.state as Extract<WizardState, { mode: 'IMPRISONED' }>;
    const insideTower = state.towers[imprisoned.insideTowerId];
    // 从原封印塔的登记中移除（apply-event 的 WIZARD_RELEASED 会幂等再处理一次）
    if (insideTower) {
      const i = insideTower.imprisonedWizards.indexOf(freedWizardId);
      if (i >= 0) insideTower.imprisonedWizards.splice(i, 1);
    }

    // 放到本塔堆最顶端（顶塔上）；若堆为空则落到地面（理论上不会，因为玩家刚点了该堆里的塔）
    const topTower = topTowerAt(state, spaceIndex);
    const to: WizardState = topTower
      ? { mode: WizardStateType.ON_TOWER_TOP, spaceIndex, topTowerId: topTower }
      : { mode: WizardStateType.ON_GROUND, spaceIndex };
    wizard.state = to;

    emit('WIZARD_RELEASED', { wizardId: freedWizardId, to });
    void tower;
    return { enteredCastle: false };
  },
};
