import { ENGINE_VERSION } from '@wt/engine';

/**
 * Phase 3 前端 MVP 占位入口。
 * 当前仅展示引擎版本，棋盘渲染等将在 T3.1 起逐步实现。
 */
export function App() {
  return (
    <div style={{ fontFamily: 'sans-serif', padding: 24 }}>
      <h1>巫师飞塔 / The Wandering Towers</h1>
      <p>标准版数字化开发中 — Phase 0 工程骨架已就绪。</p>
      <p style={{ color: '#666' }}>引擎版本：{ENGINE_VERSION}</p>
    </div>
  );
}
