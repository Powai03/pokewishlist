// @ts-check
import js from '@eslint/js'
import prettier from 'eslint-config-prettier'
import globals from 'globals'
import tseslint from 'typescript-eslint'

export default tseslint.config(
  { ignores: ['dist/', 'dist-lambda/', 'coverage/'] },

  js.configs.recommended,
  ...tseslint.configs.recommended,

  {
    files: ['**/*.ts'],
    languageOptions: { globals: globals.node },
    rules: {
      'no-console': ['error', { allow: ['info', 'warn', 'error'] }],
      'no-debugger': 'error',
    },
  },

  {
    files: ['scripts/**/*.mjs'],
    languageOptions: { globals: globals.node },
  },

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

  prettier,
)
