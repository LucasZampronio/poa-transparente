import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';
import globals from 'globals';

export default tseslint.config(
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  {
    languageOptions: {
      globals: {
        ...globals.node,
        ...globals.browser,
        ...globals.jest,
      },
    },
    rules: {
      '@typescript-eslint/no-explicit-any': 'off', // Too many for now, mentor note: improve types later
      '@typescript-eslint/no-unused-vars': 'warn',
      'no-console': 'off',
      'no-undef': 'error',
      'prefer-const': 'warn',
    },
  },
  {
    ignores: [
      '**/dist/**',
      '**/node_modules/**',
      'coverage/**',
      'tmp/**',
      '**/*.cjs',
      'api/scripts/**',
      'api/*.js',
      'etl/**', // Python project
    ],
  }
);
