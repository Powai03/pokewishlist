import { defineConfig, devices } from '@playwright/test'

// Tests de bout en bout (E2E) : un vrai navigateur pilote l'application buildée.
export default defineConfig({
  testDir: 'e2e',
  forbidOnly: !!process.env.CI, // interdit un `test.only` oublié en CI
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: 'http://localhost:3100',
    trace: 'retain-on-failure', // enregistre un « film » du test quand il échoue
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  // Lance le serveur de production (après `npm run build`) avant les tests.
  webServer: {
    command: 'node .output/server/index.mjs',
    env: { PORT: '3100' }, // port dédié, pour ne pas tomber sur un autre serveur local
    url: 'http://localhost:3100',
    reuseExistingServer: !process.env.CI,
  },
})
