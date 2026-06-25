import type { GameEvent, GameState, PlayerState, SpellDefinition, CastSpellPayload } from '@wt/shared';

/**
 * 法术三层架构（V4 §12.1）— 接口层
 *
 * 每张法术实现 ISpell：
 *  - definition：静态定义（来自 shared 的 STANDARD_SPELL_POOL）
 *  - canCast：校验层（目标规则、时机上下文），不满足抛 RuleError
 *  - resolve：执行层，复用基础规则函数（moveWizardExact/moveTowerSegment 等），
 *    产事件 + 改 state，返回是否导致巫师进城堡
 *
 * 法术不另起伪规则：移动类法术直接复用 rules/* 的基础移动函数（V4 §5.2）。
 */

/** 法术结算上下文，由 castSpell 主流程构造后传入 canCast / resolve */
export interface SpellCastContext {
  state: GameState;
  player: PlayerState;
  payload: CastSpellPayload;
  emit: (type: GameEvent['type'], payload: unknown) => GameEvent;
}

/** 法术执行结果 */
export interface SpellResolveResult {
  /** 法术效果是否导致某巫师进入乌鸦城堡（决定是否触发城堡移动+回合结束） */
  enteredCastle: boolean;
}

export interface ISpell {
  /** 静态定义（引用 shared 的 SpellDefinition） */
  definition: SpellDefinition;

  /** 校验层：目标规则校验，不满足抛 RuleError */
  canCast(ctx: SpellCastContext): void;

  /** 执行层：产事件 + 改 state，返回 enteredCastle */
  resolve(ctx: SpellCastContext): SpellResolveResult;
}
