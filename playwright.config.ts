import { defineConfig, devices } from '@playwright/test';

const uiBaseURL = process.env.UI_BASE_URL ?? 'https://www.saucedemo.com';
const apiBaseURL = process.env.API_BASE_URL ?? 'https://restful-booker.herokuapp.com';

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  // Обмежуємо кількість одночасних тестів, оскільки обидва демосервіси спільні.
  workers: 2,
  timeout: 60_000,
  globalTimeout: 10 * 60_000,
  expect: { timeout: 10_000 },
  reporter: [
    ['list'],
    ['html', { open: 'never' }],
    ['junit', { outputFile: 'test-results/junit.xml' }],
    ['json', { outputFile: 'test-results/results.json' }],
  ],
  use: {
    // SauceDemo позначає елементи атрибутом data-test. Саме його шукає getByTestId().
    testIdAttribute: 'data-test',
    actionTimeout: 15_000,
    navigationTimeout: 30_000,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    {
      name: 'ui',
      testMatch: 'ui/**/*.spec.ts',
      use: { ...devices['Desktop Chrome'], baseURL: uiBaseURL },
    },
    {
      name: 'generated',
      testMatch: 'generated/**/*.spec.ts',
      use: { ...devices['Desktop Chrome'], baseURL: uiBaseURL },
    },
    {
      name: 'api',
      testMatch: 'api/**/*.spec.ts',
      use: { baseURL: apiBaseURL, extraHTTPHeaders: { Accept: 'application/json' } },
    },
    {
      name: 'known-bugs',
      testMatch: 'known-bugs/**/*.spec.ts',
      use: { ...devices['Desktop Chrome'], baseURL: uiBaseURL },
    },
  ],
});
