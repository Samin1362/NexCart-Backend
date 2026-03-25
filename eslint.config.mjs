import tsPlugin from '@typescript-eslint/eslint-plugin';
import tsParser from '@typescript-eslint/parser';

export default [
  {
    files: ['src/**/*.ts'],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        project: './tsconfig.json',
        tsconfigRootDir: import.meta.dirname,
      },
    },
    plugins: {
      '@typescript-eslint': tsPlugin,
    },
    rules: {
      // Disable base rule — TS version handles this better
      'no-unused-vars': 'off',
      // Warn on unused vars, but allow underscore-prefixed params (e.g. _req, _res, _next)
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      // Warn on explicit `any` usage
      '@typescript-eslint/no-explicit-any': 'warn',
      // Disallow bare console.log in production code (console.error/warn are fine for error handlers)
      'no-console': ['warn', { allow: ['error', 'warn'] }],
      // Prevent accidental fall-through in switch statements
      'no-fallthrough': 'error',
    },
  },
  {
    // server.ts uses console.log for startup messages — that's intentional
    files: ['src/server.ts'],
    rules: {
      'no-console': 'off',
    },
  },
  {
    // Ignore compiled output, node_modules, and seed script (excluded from tsconfig)
    ignores: ['dist/**', 'node_modules/**', 'src/seed.ts'],
  },
];
