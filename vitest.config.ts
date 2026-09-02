import { defineConfig } from 'vitest/config';

// Vitest config — unit tests only (fast, hermetic).
// Playwright E2E lives in /tests and is run separately (npx playwright test).
export default defineConfig({
  test: {
    include: ['src/**/*.test.{ts,tsx}'],
    exclude: ['node_modules/**', 'dist/**', 'tests/**'],
    environment: 'node',
    reporters: ['default'],
    coverage: {
      provider: 'v8',
      include: ['src/lib/**', 'src/services/**'],
      reporter: ['text', 'json', 'html'],
    },
  },
});