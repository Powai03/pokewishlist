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
  // Typage explicite obligatoire dans le code de l'application.
  .append({
    files: ['app/**/*.ts', 'app/**/*.vue'],
    rules: {
      // Toute fonction exportée déclare le type de ses paramètres et de son retour.
      '@typescript-eslint/explicit-module-boundary-types': 'error',
      // Toute fonction nommée déclare son type de retour ; les fonctions passées en argument
      // (ex. `computed(() => …)`, `.map((p) => …)`) restent libres : leur type est déduit.
      '@typescript-eslint/explicit-function-return-type': [
        'error',
        { allowExpressions: true, allowTypedFunctionExpressions: true },
      ],
    },
  })
  // En dernier : désactive toutes les règles ESLint de mise en forme qui contrediraient Prettier.
  .append(prettier)
