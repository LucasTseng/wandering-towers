import type { RuleErrorCode } from '@wt/shared';

/**
 * 规则错误（V2 开发需求 §36 / V3 后端协议 §15）
 *
 * 引擎在命令校验或结算失败时抛出 RuleError，
 * 由上层（LocalGameAdapter / 服务端）转为失败响应。
 */
export class RuleError extends Error {
  readonly code: RuleErrorCode;
  constructor(code: RuleErrorCode, message?: string) {
    super(message ?? code);
    this.name = 'RuleError';
    this.code = code;
  }
}

export function isRuleError(e: unknown): e is RuleError {
  return e instanceof RuleError;
}
