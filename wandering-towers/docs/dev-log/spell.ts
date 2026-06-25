import type { ActionCommand, GameEvent, GameState } from '@wt/shared';

/**
 * 法术校验上下文
 */
export interface SpellValidationContext {
  state: GameState;
  command: ActionCommand;
}

/**
 * 法术结算上下文
 */
export interface SpellResolutionContext {
  state: GameState;
  command: ActionCommand;
  emit: (type: GameEvent['type'], payload: unknown) => GameEvent;
}

/**
 * 法术实现接口（三层架构中的校验层与结算层）
 */
export interface ISpell {
  /**
   * **校验层**: 检查法术是否可施放。若不可，则抛出 RuleError。
   */
  canCast(context: SpellValidationContext): void;
  /**
   * **结算层**: 计算法术效果，生成事件。
   */
  resolve(context: SpellResolutionContext): void;
}