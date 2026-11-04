import { defineConfig, devices } from '@playwright/test'

export const FRONT_URL = 'http://localhost:3100'
export const API_URL = 'http://localhost:3101'
export const POKEAPI_MOCK_URL = 'http://localhost:3102'

export default defineConfig({
  testDir: 'e2e',
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: FRONT_URL,
    trace: 'retain-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: [
    {
      command: 'node e2e/pokeapi-mock.mjs',
      url: `${POKEAPI_MOCK_URL}/health`,
      env: { PORT: '3102' },
      reuseExistingServer: !!process.env.CI,
    },
    {
      command: 'node api/dist/index.js',
      url: `${API_URL}/health`,
      env: { PORT: '3101', NODE_ENV: 'test', CORS_ORIGIN: FRONT_URL },
      reuseExistingServer: !!process.env.CI,
    },
    {
      command: 'node .output/server/index.mjs',
      url: FRONT_URL,
      env: {
        PORT: '3100',
        NUXT_PUBLIC_API_BASE: API_URL,
        NUXT_PUBLIC_POKEAPI_BASE: POKEAPI_MOCK_URL,
      },
      reuseExistingServer: !!process.env.CI,
    },
  ],
})
