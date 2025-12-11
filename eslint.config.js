import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import react from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';

export default tseslint.config(
  // Ignore patterns
  {
    ignores: [
      '**/dist/**',
      '**/node_modules/**',
      '**/build/**',
      '**/.svelte-kit/**',
      '**/coverage/**',
      'examples/**', // Don't lint examples
      'bench/**',
      'scripts/**',
      'packages/*/scripts/**',
      '.storybook/**',
      'storybook-static/**',
      '**/test-debug.ts',
      '**/test-debug.js',
      '**/*.stories.tsx',
      '**/*.stories.ts',
    ],
  },

  // Base JavaScript config for .js files
  {
    files: ['**/*.js'],
    ...js.configs.recommended,
    languageOptions: {
      globals: {
        console: 'readonly',
        process: 'readonly',
        __dirname: 'readonly',
        require: 'readonly',
        module: 'readonly',
      },
    },
  },

  // TypeScript config for source files (not tests)
  {
    files: ['packages/*/src/**/*.ts', 'packages/*/src/**/*.tsx'],
    extends: [...tseslint.configs.recommended],
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: {
        project: './packages/*/tsconfig.json',
      },
    },
    rules: {
      // Customize these rules as needed
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-unused-vars': ['warn', {
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_',
      }],
    },
  },

  // TypeScript config for test files (without project requirement)
  {
    files: ['packages/*/tests/**/*.ts', 'packages/*/tests/**/*.tsx'],
    extends: [...tseslint.configs.recommended],
    languageOptions: {
      parser: tseslint.parser,
    },
    rules: {
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-unused-vars': ['warn', {
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_',
      }],
    },
  },

  // React-specific config
  {
    files: ['packages/react/**/*.tsx', 'packages/react/**/*.ts'],
    plugins: {
      react,
      'react-hooks': reactHooks,
    },
    languageOptions: {
      parserOptions: {
        ecmaFeatures: {
          jsx: true,
        },
      },
    },
    rules: {
      ...react.configs.recommended.rules,
      ...reactHooks.configs.recommended.rules,
      'react/react-in-jsx-scope': 'off', // Not needed in React 17+
      'react/prop-types': 'off', // Using TypeScript for prop validation
    },
    settings: {
      react: {
        version: 'detect',
      },
    },
  },

  // Svelte packages - basic TS checking only (Svelte files need special handling)
  {
    files: ['packages/svelte/**/*.ts'],
    // Just use the TS config, Svelte files are handled by svelte-check
  },
);
