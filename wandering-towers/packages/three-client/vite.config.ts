import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';

const sharedSrc = fileURLToPath(new URL('../shared/src', import.meta.url));
const engineSrc = fileURLToPath(new URL('../engine/src', import.meta.url));

/**
 * 3D 版客户端（@wt/three-client）
 *
 * 与 @wt/client 完全独立：同一套 @wt/engine 规则引擎与 @wt/shared 类型，
 * 只替换渲染层与界面皮肤。端口 8009，避免与原版 8008 冲突。
 */
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@wt/shared': sharedSrc,
      '@wt/engine': engineSrc,
    },
  },
  server: {
    port: 8009,
  },
  build: {
    chunkSizeWarningLimit: 1600,
  },
});
