import js from '@eslint/js'
import tsPlugin from '@typescript-eslint/eslint-plugin'
import tsParser from '@typescript-eslint/parser'
import prettierPlugin from 'eslint-plugin-prettier'
import prettierConfig from 'eslint-config-prettier'

const eslintConfig = [
  js.configs.recommended,
  prettierConfig,
  {
    files: ['**/*.ts', '**/*.tsx'],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module'
      },
      globals: {
        console: 'readonly',
        process: 'readonly',
        Buffer: 'readonly',
        __dirname: 'readonly',
        __filename: 'readonly',
        module: 'readonly',
        require: 'readonly',
        Bun: 'readonly',
        Response: 'readonly',
        Request: 'readonly',
        FormData: 'readonly',
        File: 'readonly',
        Blob: 'readonly',
        setTimeout: 'readonly',
        setInterval: 'readonly',
        clearTimeout: 'readonly',
        clearInterval: 'readonly',
        fetch: 'readonly'
      }
    },
    plugins: {
      '@typescript-eslint': tsPlugin,
      prettier: prettierPlugin
    },
    rules: {
      // Prettier - 使用项目的 .prettierrc 配置
      'prettier/prettier': [
        'error',
        {
          semi: false,
          singleQuote: true,
          tabWidth: 2,
          useTabs: false,
          trailingComma: 'none',
          printWidth: 100,
          bracketSpacing: true,
          arrowParens: 'always',
          endOfLine: 'auto'
        }
      ],

      // TypeScript
      '@typescript-eslint/no-unused-vars': [
        'warn',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }
      ],
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/consistent-type-imports': [
        'warn',
        { prefer: 'type-imports', fixStyle: 'inline-type-imports' }
      ],

      // General
      'no-console': 'off',
      'prefer-const': 'error',
      'no-unused-vars': 'off',

      // Indentation - let Prettier handle it
      indent: 'off'
    }
  },
  {
    files: ['**/*.spec.ts', '**/*.test.ts'],
    languageOptions: {
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module'
      }
    },
    rules: {
      // Allow dynamic imports in test files (Bun supports them)
      '@typescript-eslint/no-unsupported-features/es-syntax': 'off',
      // Allow any types in test files for mocks
      '@typescript-eslint/no-explicit-any': 'off',
      // Disable TypeScript compiler checks for dynamic imports
      'no-restricted-syntax': 'off'
    }
  },
  {
    ignores: ['node_modules/**', 'dist/**', 'generated/**', '*.config.js', '*.config.mjs']
  }
]

export default eslintConfig
