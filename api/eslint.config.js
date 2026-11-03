// @ts-check
// ESLint de l'API : juge la QUALITÉ du code (Prettier s'occupe de la forme).
import js from '@eslint/js'
import prettier from 'eslint-config-prettier'
import globals from 'globals'
import tseslint from 'typescript-eslint'

export default tseslint.config(
  // Fichiers générés : jamais analysés.
  { ignores: ['dist/', 'dist-lambda/', 'coverage/'] },

  // Règles recommandées JavaScript + TypeScript.
  js.configs.recommended,
  ...tseslint.configs.recommended,

  {
    files: ['**/*.ts'],
    languageOptions: { globals: globals.node },
    rules: {
      // Pas de traces de débogage oubliées : console.info reste permis (message de démarrage du serveur).
      'no-console': ['error', { allow: ['info', 'warn', 'error'] }],
      'no-debugger': 'error',
    },
  },

  // Scripts Node.js (build Lambda) : variables globales de Node (process, URL…).
  {
    files: ['scripts/**/*.mjs'],
    languageOptions: { globals: globals.node },
  },

  // Code de l'API : typage explicite obligatoire des fonctions.
  {
    files: ['src/**/*.ts'],
    rules: {
      '@typescript-eslint/explicit-module-boundary-types': 'error',
      '@typescript-eslint/explicit-function-return-type': [
        'error',
        { allowExpressions: true, allowTypedFunctionExpressions: true },
      ],
    },
  },

  // En dernier : désactive les règles de mise en forme qui contrediraient Prettier.
  prettier,
)
