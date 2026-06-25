import { ENGINE_VERSION } from '@wt/engine';

/**
 * 前端占位入口。
 * 引擎核心（Phase 0–1）已可用；法术系统（Phase 2）与前端 UI（Phase 3）待实装。
 * 详见 docs/开发设计文档-架构与实现基线.md。
 */
export function App() {
  return (
    <div style={{ fontFamily: 'sans-serif', padding: 24 }}>
      <h1>巫师飞塔 / The Wandering Towers</h1>
      <p>标准版数字化开发中 — 引擎核心已就绪，前端待实装。</p>
      <p style={{ color: '#666' }}>引擎版本：{ENGINE_VERSION}</p>
    </div>
  );
}
