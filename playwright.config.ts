import { defineConfig, devices } from '@playwright/test';

/**
 * Voice of Gudalur — E2E config.
 * Chromium-family only (Firefox/WebKit binaries not installed locally;
 * all PWA/Service-Worker features are exercised via Chromium anyway).
 *
 * The LocationGate requires geolocation before rendering the app, so every
 * test context is granted the permission with Gudalur coordinates —
 * simulating a real user tapping "Allow".
 */
export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 1,
  workers: process.env.CI ? 1 : 2, // cap parallel browsers — GPU crash-storm on Windows with 4+
  reporter: 'list',
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    permissions: ['geolocation'],
    geolocation: { latitude: 11.5093, longitude: 76.5353 }, // Gudalur, Nilgiris
    launchOptions: {
      // headless-shell GPU process crashes (error_code=63) on some Windows
      // GPU drivers — software rendering is fully sufficient for these tests
      args: ['--disable-gpu', '--disable-software-rasterizer'],
    },
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'mobile', use: { ...devices['Pixel 7'] } },
  ],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
  },
});

