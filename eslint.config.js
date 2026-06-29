import js from '@eslint/js'
import globals from 'globals'
import react from 'eslint-plugin-react'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'

export default [
  { ignores: ['dist'] },
  {
    files: ['**/*.{js,jsx}'],
    languageOptions: {
      ecmaVersion: 2020,
      globals: { ...globals.browser, ...globals.node },
      parserOptions: {
        ecmaVersion: 'latest',
        ecmaFeatures: { jsx: true },
        sourceType: 'module',
      },
    },
    settings: { react: { version: '18.3' } },
    plugins: {
      react,
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      ...js.configs.recommended.rules,
      ...react.configs.recommended.rules,
      ...react.configs['jsx-runtime'].rules,
      ...reactHooks.configs.recommended.rules,
      'react/jsx-no-target-blank': 'off',
      'react/prop-types': 'off',
      'no-unused-vars': 'warn',
      'react/no-unescaped-entities': 'off',
      'react-refresh/only-export-components': [
        'warn',
        { allowConstantExport: true },
      ],
      // Phase 6: forbid direct axios — use the shared client (auth + single-flight
      // refresh-token interceptors live there). 'warn' for now (~113 legacy
      // offenders migrate incrementally); flip to 'error' once they're cleared.
      'no-restricted-imports': [
        'warn',
        {
          paths: [
            {
              name: 'axios',
              message:
                'Do not import axios directly. Use the shared client: `import { api } from "src/shared/api/client"`. Direct axios bypasses the auth/refresh interceptors.',
            },
          ],
        },
      ],
    },
  },
  {
    // The shared client IS the one place axios is allowed.
    files: ['src/shared/api/client.js'],
    rules: { 'no-restricted-imports': 'off' },
  },
]
