import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  timeout: 30000,
  expect: { timeout: 5000 },
  fullyParallel: false,
  retries: 0,
  use: {
    baseURL: 'http://localhost:5173/Chart-Hero/',
    headless: true,
    screenshot: 'only-on-failure',
    trace: 'on-first-retry',
  },
  projects: [
    { name: 'chromium', use: { browserName: 'chromium' } },
  ],
  outputDir: './test-results/',
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5173/Chart-Hero/',
    reuseExistingServer: true,
    timeout: 30000,
  },
});
