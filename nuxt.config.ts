// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  modules: ['@nuxt/eslint'],
  devtools: { enabled: true },
  css: ['~/assets/css/main.css'],
  runtimeConfig: {
    public: {
      // Adresse de l'API Hono. Modifiable sans rebuild : NUXT_PUBLIC_API_BASE=https://… node .output/server/index.mjs
      apiBase: 'http://localhost:3002',
      // Adresse de PokéAPI pour la fiche d'un Pokémon (NUXT_PUBLIC_POKEAPI_BASE) : remplacée par un faux serveur dans les tests E2E.
      pokeapiBase: 'https://pokeapi.co/api/v2',
    },
  },
  compatibilityDate: '2025-07-15',
  typescript: {
    // Fait aussi vérifier par `nuxt typecheck` les tests et les fichiers de config (hors du dossier app/).
    nodeTsConfig: {
      include: [
        '../test/**/*.ts',
        '../e2e/**/*.ts',
        '../playwright.config.ts',
        '../vitest.config.ts',
      ],
    },
  },
  eslint: {
    // La mise en forme est confiée à Prettier : on coupe les règles de style d'ESLint pour éviter qu'ils se contredisent.
    config: { stylistic: false },
  },
})
