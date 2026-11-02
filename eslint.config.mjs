// @ts-check
import withNuxt from './.nuxt/eslint.config.mjs'

export default withNuxt({
  rules: {
    // Pas de traces de débogage oubliées dans le code livré : la CI passe au rouge.
    'no-console': ['error', { allow: ['warn', 'error'] }], // console.log interdit, console.warn/error tolérés
    'no-debugger': 'error', // un `debugger` figerait le navigateur de l'utilisateur (outils dev ouverts)
  },
})
