// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  modules: ['@nuxt/eslint', '@nuxtjs/i18n'],
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
  // Traductions : un fichier JSON par langue dans i18n/locales/ (en, fr, es, jp).
  // · anglais par défaut, quelle que soit la langue du navigateur ;
  // · pas de préfixe dans l'adresse (/pokemon/495 dans toutes les langues) ;
  // · le choix du visiteur est mémorisé dans un cookie par app/plugins/locale-cookie.ts.
  i18n: {
    defaultLocale: 'en',
    strategy: 'no_prefix',
    detectBrowserLanguage: false,
    locales: [
      { code: 'en', language: 'en-US', name: 'English', file: 'en.json' },
      { code: 'fr', language: 'fr-FR', name: 'Français', file: 'fr.json' },
      { code: 'es', language: 'es-ES', name: 'Español', file: 'es.json' },
      // Code de LANGUE « ja » (ISO 639-1) ; « jp » est un code de PAYS, gardé pour le nom du fichier.
      { code: 'ja', language: 'ja-JP', name: '日本語', file: 'jp.json' },
    ],
  },
  eslint: {
    // La mise en forme est confiée à Prettier : on coupe les règles de style d'ESLint pour éviter qu'ils se contredisent.
    config: { stylistic: false },
  },
})
