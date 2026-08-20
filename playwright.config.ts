import { defineConfig, devices } from '@playwright/test';

/**
 * Layout checks in a real browser, which is the only place layout exists.
 *
 * These are not pixel snapshots. A baseline image fails when a runner renders a font a shade
 * differently, which teaches everybody to ignore it. Every assertion here reads a computed value
 * or a measured position instead, so it fails when something is genuinely in the wrong place.
 *
 * `pnpm build` has to have run: the server under test is the production one, so what CI checks is
 * what a person would load.
 */
export default defineConfig({
  testDir: './test/visual',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  // The html reporter is what writes attachments to disk. Without it the rail PNGs each run
  // produces exist only in memory, and the artifact upload has nothing to collect.
  reporter: process.env.CI
    ? [['github'], ['html', { open: 'never', outputFolder: 'playwright-report' }]]
    : [['list']],
  use: {
    baseURL: 'http://localhost:3000',
    screenshot: 'only-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: 'pnpm start',
    url: 'http://localhost:3000',
    // Locally there is usually a dev server already up; in CI there never is.
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
