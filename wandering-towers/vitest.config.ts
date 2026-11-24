import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    // Windows 上多个 worker 并发写同一个 vite-node 临时缓存文件会偶发 EPERM，
    // 导致测试文件被静默跳过。顺序执行可稳定跑完，Mac 上同样适用（仅略慢）。
    fileParallelism: false,
    include: ['packages/**/tests/**/*.spec.ts', 'packages/**/src/**/*.spec.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      include: ['packages/*/src/**/*.ts'],
      exclude: ['**/*.spec.ts', '**/index.ts', '**/version.ts'],
    },
  },
});
