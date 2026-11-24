import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';

const sharedSrc = fileURLToPath(new URL('../shared/src', import.meta.url));
const engineSrc = fileURLToPath(new URL('../engine/src', import.meta.url));

/**
 * 主客户端（@wt/client）— Three.js 渲染层
 *
 * 2026-11-24 起为本仓库主线：Three.js WebGL 场景 + 羊皮纸界面。
 * 规则引擎与类型仍来自 @wt/engine 与 @wt/shared。
 * 经典 CSS 3D 版已归档至 archive/v1-css3d-client（仅作参考，不参与构建）。
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
    port: 8008,
  },
  build: {
    chunkSizeWarningLimit: 1600,
  },
});
