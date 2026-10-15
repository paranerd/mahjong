import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  use: { baseURL: process.env.MAHJONG_BASE_URL ?? 'http://127.0.0.1:4173/', headless: true },
  projects: [
    { name: 'chromium', use: { browserName: 'chromium' } },
    { name: 'firefox', use: { browserName: 'firefox' } },
    { name: 'webkit', use: { browserName: 'webkit' } },
  ],
});
