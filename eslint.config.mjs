// @ts-check
import prettier from 'eslint-config-prettier'
import withNuxt from './.nuxt/eslint.config.mjs'

// Répartition des rôles :
// - ESLint juge la QUALITÉ du code (bugs probables, mauvaises pratiques) ;
// - Prettier s'occupe de la FORME (guillemets, points-virgules, retours à la ligne).
export default withNuxt({
  rules: {
    // Pas de traces de débogage oubliées dans le code livré : la CI passe au rouge.
    'no-console': ['error', { allow: ['warn', 'error'] }], // console.log interdit, console.warn/error tolérés
    'no-debugger': 'error', // un `debugger` figerait le navigateur de l'utilisateur (outils dev ouverts)
  },
})
  // En dernier : désactive toutes les règles ESLint de mise en forme qui contrediraient Prettier.
  .append(prettier)
