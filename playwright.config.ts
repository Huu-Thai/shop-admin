import { defineConfig, devices } from '@playwright/test';

/**
 * Browser suite against a running admin (E2E_BASE_URL) and shop API. Credentials of an admin with
 * every permission come from E2E_EMAIL / E2E_PASSWORD. See docs/TESTING.md.
 */
const baseURL = process.env.E2E_BASE_URL ?? 'http://localhost:3000';
const desktop = { ...devices['Desktop Chrome'], storageState: 'e2e/.auth/admin.json' };

export default defineConfig({
  testDir: 'e2e',
  outputDir: 'test-results',
  fullyParallel: true,
  workers: process.env.CI ? 2 : 4,
  retries: process.env.CI ? 1 : 0,
  reporter: [['list'], ['html', { open: 'never', outputFolder: 'playwright-report' }]],
  timeout: 45_000,
  expect: { timeout: 10_000 },
  use: { baseURL, locale: 'en-US', trace: 'retain-on-failure', screenshot: 'only-on-failure' },
  projects: [
    { name: 'setup', testMatch: /auth\.setup\.ts/ },
    {
      name: 'signed-out',
      testMatch: /signed-out\.spec\.ts/,
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'desktop-1440',
      dependencies: ['setup'],
      testIgnore: /signed-out|auth\.setup/,
      use: { ...desktop, viewport: { width: 1440, height: 900 } },
    },
    {
      name: 'laptop-1280',
      dependencies: ['setup'],
      testMatch: /screens\.spec\.ts/,
      use: { ...desktop, viewport: { width: 1280, height: 800 } },
    },
    {
      name: 'tablet-768',
      dependencies: ['setup'],
      testMatch: /screens\.spec\.ts/,
      use: { ...desktop, viewport: { width: 768, height: 1024 }, hasTouch: true },
    },
    {
      name: 'phone-360',
      dependencies: ['setup'],
      testMatch: /screens\.spec\.ts/,
      use: { ...desktop, viewport: { width: 360, height: 780 }, hasTouch: true, isMobile: true },
    },
  ],
});
