import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';

/**
 * Live Supabase verification, kept out of `npm test` on purpose: it needs real credentials
 * and a network, and it writes real rows. Run with `npm run verify:supabase`.
 */
export default defineConfig({
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  test: {
    environment: 'node',
    include: ['e2e/**/*.e2e.test.ts'],
    testTimeout: 60_000,
    hookTimeout: 60_000,
    fileParallelism: false,
  },
});
