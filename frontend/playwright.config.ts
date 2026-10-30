import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  timeout: 90_000,
  expect: { timeout: 20_000 },
  use: { baseURL: 'http://127.0.0.1:3001', trace: 'retain-on-failure' },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 1000 } } },
    { name: 'mobile', use: { ...devices['iPhone 13'], defaultBrowserType: 'chromium' } },
  ],
  webServer: [
    { command: 'python -m uvicorn app.main:app --host 127.0.0.1 --port 8000', cwd: '../backend',
      url: 'http://127.0.0.1:8000/health', reuseExistingServer: !process.env.CI },
    { command: 'npm run start -- --hostname 127.0.0.1 -p 3001',
      url: 'http://127.0.0.1:3001', reuseExistingServer: !process.env.CI },
  ],
});
