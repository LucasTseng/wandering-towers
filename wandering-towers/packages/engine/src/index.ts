/**
 * @wt/engine — 规则引擎（纯逻辑，无 IO）
 */
export { ENGINE_VERSION } from './version';
export * from './state/rng';
export * from './state/selectors';
export * from './state/state-builder';
export * from './state/apply-event';
export * from './replay/replay';
export * from './rule-error';
export * from './event-bus';
export * from './rule-engine';
export * from './invariants';
export * from './rules';
