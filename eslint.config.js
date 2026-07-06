import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import { globalIgnores } from 'eslint/config'

export default tseslint.config([
  globalIgnores(['dist', 'site']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs['recommended-latest'],
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    rules: {
      // Allow the omit-via-destructuring idiom: `const { textAlign: _textAlign, ...rest } = …`
      '@typescript-eslint/no-unused-vars': ['error', {
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_',
        caughtErrorsIgnorePattern: '^_',
        ignoreRestSiblings: true,
      }],
    },
  },
  {
    // Library entry barrels mix component and function exports by design;
    // fast refresh does not apply to package entry points. Same for the
    // inline-toolbar item factories (fragments of building blocks + helpers)
    // and the rich-text module (renderer component + pure projections).
    files: [
      'src/index.tsx',
      'src/email/index.tsx',
      'src/components/inline/**',
      'src/email/rich-text/**',
    ],
    rules: {
      'react-refresh/only-export-components': 'off',
    },
  },
])
