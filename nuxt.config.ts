import { readFileSync } from 'node:fs'

const gen5: { id: number; name: string }[] = JSON.parse(
  readFileSync(new URL('./data/gen5-pokemon.json', import.meta.url), 'utf8'),
)

export default defineNuxtConfig({
  modules: ['@nuxt/eslint', '@nuxtjs/i18n'],
  devtools: { enabled: true },
  css: ['~/assets/css/main.css'],
  runtimeConfig: {
    public: {
      apiBase: process.env.NUXT_PUBLIC_API_BASE || 'http://localhost:3002',
      pokeapiBase: 'https://pokeapi.co/api/v2',
      commit: process.env.GIT_COMMIT || 'local',
    },
  },
  nitro: {
    prerender: {
      routes: [
        ...(process.env.NITRO_PRESET === 'static' ? ['/'] : []),
        ...gen5.map((p) => `/pokemon/${p.name}`),
      ],
      crawlLinks: false,
      concurrency: 8,
      failOnError: true,
    },
  },
  compatibilityDate: '2025-07-15',
  typescript: {
    nodeTsConfig: {
      include: [
        '../test/**/*.ts',
        '../e2e/**/*.ts',
        '../playwright.config.ts',
        '../vitest.config.ts',
      ],
    },
  },
  i18n: {
    defaultLocale: 'en',
    strategy: 'no_prefix',
    detectBrowserLanguage: false,
    locales: [
      { code: 'en', language: 'en-US', name: 'English', file: 'en.json' },
      { code: 'fr', language: 'fr-FR', name: 'Français', file: 'fr.json' },
      { code: 'es', language: 'es-ES', name: 'Español', file: 'es.json' },
      { code: 'ja', language: 'ja-JP', name: '日本語', file: 'jp.json' },
    ],
  },
  eslint: {
    config: { stylistic: false },
  },
})
