import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';

/**
 * 归档版（@wt/v1-css3d-client）— 巫师飞塔第一版渲染层
 *
 * 仅作参考存档，自 2026-11-24 起不再启用、不参与 workspace 构建。
 * 如需临时复跑：把本目录加入 pnpm-workspace.yaml 后执行 pnpm install，端口 8010。
 */

const sharedSrc = fileURLToPath(new URL('../../packages/shared/src', import.meta.url));
const engineSrc = fileURLToPath(new URL('../../packages/engine/src', import.meta.url));

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@wt/shared': sharedSrc,
      '@wt/engine': engineSrc,
    },
  },
  server: {
    port: 8010,
  },
});
