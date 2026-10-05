import js from '@eslint/js'
import tseslint from 'typescript-eslint'
import prettier from 'eslint-config-prettier'

export default [
  // ESLint's recommended JavaScript rules
  js.configs.recommended,

  // TypeScript ESLint's recommended rules
  ...tseslint.configs.recommended,

  // JavaScript files
  {
    files: ['**/*.js', '**/*.jsx', '**/*.mjs', '**/*.cjs'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
    },
  },

  // TypeScript files
  {
    files: ['**/*.ts', '**/*.tsx'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
    },
  },

  // Files/directories to ignore
  {
    ignores: [
      'node_modules/',
      'dist/',
      'docs/',
      'coverage/',
      '*.min.js',
    ],
  },

  // Disable ESLint rules that conflict with Prettier
  prettier,
]
