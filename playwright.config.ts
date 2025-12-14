import { execSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { defineConfig, devices } from '@playwright/test';

// Check if Tailscale is running
function isTailscaleRunning(): boolean {
  try {
    const output = execSync('tailscale status --json', {
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    const status = JSON.parse(output);
    return !!status.Self?.DNSName;
  } catch {
    return false;
  }
}

// Detect if running in container with Tailscale (HTTPS)
const isContainer = existsSync('/.dockerenv');
const hasTailscale = isTailscaleRunning();
const useHttps = isContainer && hasTailscale;

const PORT = process.env.E2E_PORT || '5173';
const PROTOCOL = useHttps ? 'https' : 'http';
const BASE_URL = `${PROTOCOL}://localhost:${PORT}`;

export default defineConfig({
  testDir: './e2e-tests',
  timeout: 10 * 1000,
  expect: {
    timeout: 5 * 1000,
  },
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : 3,

  reporter: [
    ['html', { outputFolder: 'playwright-report', open: 'never' }],
    ['list'],
  ],

  use: {
    baseURL: BASE_URL,
    trace: 'retain-on-failure',
    video: 'retain-on-failure',
    screenshot: 'only-on-failure',
    actionTimeout: 5000,
    ignoreHTTPSErrors: useHttps,
  },

  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
      },
    },
    // Mobile testing disabled - requires webkit which may not be available
    // {
    //   name: 'mobile',
    //   use: { ...devices['iPhone 14 Pro'] },
    // },
  ],

  webServer: {
    command: `npm run dev -- --port ${PORT}`,
    url: BASE_URL,
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
    ignoreHTTPSErrors: useHttps,
  },

  outputDir: 'test-results/',
});
