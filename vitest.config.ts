import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    include: ['test/**/*.test.ts'],
    setupFiles: ['test/setup.ts'],
    coverage: {
      provider: 'v8',
      include: ['app/**/*.ts', 'scripts/**/*.mjs'],
      reporter: ['text-summary', 'json-summary', 'html'],
      reportsDirectory: 'coverage',
    },
  },
})
