import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';

/**
 * The identification accuracy benchmark, kept out of BOTH `npm test` and
 * `npm run verify:supabase` on purpose.
 *
 * It reads whatever `scripts/identify_web_images.py` last wrote and scores it with the REAL
 * matcher, so it is a report rather than a suite: it asserts that the recording is
 * well-formed and says nothing at all about whether the accuracy is good enough. Thresholds
 * are what the benchmark exists to inform, and a test that failed on one would be the
 * benchmark grading itself against a number nobody has evidence for yet.
 *
 * Run: npx vitest run --config vitest.bench.config.ts
 */
export default defineConfig({
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  test: {
    environment: 'node',
    include: ['benchmark/**/*.bench.test.ts'],
    fileParallelism: false,
  },
});
