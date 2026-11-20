import { defineConfig } from '@playwright/test'
const target = process.env.PORTFOLIO_BASE_URL
export default defineConfig({
  testDir: './e2e',
  use: { baseURL: target || 'http://127.0.0.1:5173', browserName: 'chromium' },
  webServer: target
    ? undefined
    : {
        command: 'npm run dev -- --port 5173',
        url: 'http://127.0.0.1:5173',
        reuseExistingServer: !process.env.CI,
      },
})
