import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

// Unit test config. Kept separate from vite.config.ts so Playwright e2e
// (which uses its own runner) never sees vitest globals and vice versa.
// `include` is explicit: only files under tests/unit are picked up, which
// keeps tests/e2e (Playwright) cleanly out of scope.
export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'happy-dom',
    include: ['tests/unit/**/*.test.ts', 'tests/unit/**/*.test.tsx'],
    globals: false,
  },
});
