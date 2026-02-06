import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['tests/**/*.test.ts'],
    exclude: [
      'playwright-tests/**',
      'tests/provider-adapters.smoke.test.ts',
      'tests/lix-v02-compliance.test.ts',
      'tests/lix-validation.test.ts',
      'tests/e2e/intent_router_e2e.test.ts',
    ],
  },
});
