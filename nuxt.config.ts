// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  modules: ['@nuxt/eslint'],
  devtools: { enabled: true },
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
