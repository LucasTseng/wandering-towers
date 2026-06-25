import { GameContainer } from './containers/GameContainer';

/**
 * 前端入口 — 本地可玩 MVP（Phase C）。
 * 引擎权威：所有状态经 RuleEngine，前端只发 ActionCommand。
 * 详见 docs/开发设计文档-架构与实现基线.md §12。
 */
export function App() {
  return <GameContainer />;
}
