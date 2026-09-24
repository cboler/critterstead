import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env['CI'],
  retries: process.env['CI'] ? 2 : 0,
  workers: process.env['CI'] ? 1 : undefined,
  reporter: 'list',
  use: {
    baseURL: 'http://127.0.0.1:4200',
    channel: process.env['PLAYWRIGHT_CHANNEL'] || undefined,
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'phone-portrait',
      use: {
        viewport: { width: 390, height: 844 },
      },
    },
    {
      name: 'phone-landscape',
      use: {
        viewport: { width: 844, height: 390 },
      },
    },
    {
      name: 'tablet-portrait',
      use: {
        viewport: { width: 768, height: 1024 },
      },
    },
    {
      name: 'desktop',
      use: {
        viewport: { width: 1280, height: 800 },
      },
    },
  ],
  webServer: {
    command: 'npm start -- --host 127.0.0.1',
    url: 'http://127.0.0.1:4200',
    reuseExistingServer: !process.env['CI'],
    timeout: 120 * 1000,
  },
});
