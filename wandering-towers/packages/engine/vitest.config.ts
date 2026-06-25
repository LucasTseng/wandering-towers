import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.spec.ts'],
  },
  resolve: {
    alias: {
      '@wt/shared': new URL('../shared/src', import.meta.url).pathname,
    },
  },
});
