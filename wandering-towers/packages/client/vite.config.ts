import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';

const sharedSrc = fileURLToPath(new URL('../shared/src', import.meta.url));
const engineSrc = fileURLToPath(new URL('../engine/src', import.meta.url));

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@wt/shared': sharedSrc,
      '@wt/engine': engineSrc,
    },
  },
  server: {
    port: 5173,
  },
});
