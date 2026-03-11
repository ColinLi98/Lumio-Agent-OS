import { defineConfig } from '@playwright/test';

const baseURL = process.env.LUMI_BASE_URL || 'https://lumio-b-end-platform.vercel.app';

export default defineConfig({
  testDir: './playwright-tests',
  timeout: 30_000,
  retries: 0,
  use: {
    baseURL,
    headless: true,
    viewport: { width: 1280, height: 720 },
  },
});
