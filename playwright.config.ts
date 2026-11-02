import { defineConfig, devices } from '@playwright/test'

// Tests de bout en bout (E2E) « full-stack » : un vrai navigateur pilote le front buildé,
// qui parle à la VRAIE API Hono buildée. Seule PokéAPI (service externe) est simulée.
//
//   navigateur ──▶ front Nuxt (port 3100) ──fetch──▶ API Hono (port 3101)
//
// Ports dédiés, pour ne pas tomber sur un autre serveur local (dev sur 3001/3002).
export const FRONT_URL = 'http://localhost:3100'
export const API_URL = 'http://localhost:3101'

export default defineConfig({
  testDir: 'e2e',
  forbidOnly: !!process.env.CI, // interdit un `test.only` oublié en CI
  retries: process.env.CI ? 1 : 0,
  // Les tests partagent la même API (wishlist en mémoire) : on les exécute un par un.
  workers: 1,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: FRONT_URL,
    trace: 'retain-on-failure', // enregistre un « film » du test quand il échoue
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  // Démarre les deux serveurs de production (après `npm run build` et `npm --prefix api run build`).
  webServer: [
    {
      command: 'node api/dist/index.js',
      url: `${API_URL}/health`,
      env: { PORT: '3101', NODE_ENV: 'test', CORS_ORIGIN: FRONT_URL },
      reuseExistingServer: false,
    },
    {
      command: 'node .output/server/index.mjs',
      url: FRONT_URL,
      // Le front est configuré pour appeler l'API de test (runtimeConfig, sans rebuild).
      env: { PORT: '3100', NUXT_PUBLIC_API_BASE: API_URL },
      reuseExistingServer: false,
    },
  ],
})
