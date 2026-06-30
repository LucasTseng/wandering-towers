import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.spec.ts'],
  },
  resolve: {
    alias: {
      // fileURLToPath 正确解码路径中的空格等字符（如 "AI studio"），
      // 用 new URL(...).pathname 会被编码成 %20 导致模块解析失败。
      '@wt/shared': fileURLToPath(new URL('../shared/src', import.meta.url)),
    },
  },
});
