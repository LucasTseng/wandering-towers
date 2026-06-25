module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
    ecmaFeatures: { jsx: true },
  },
  plugins: ['@typescript-eslint'],
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'prettier',
  ],
  env: {
    node: true,
    es2022: true,
  },
  ignorePatterns: [
    'dist',
    'build',
    'node_modules',
    'coverage',
    '*.js',
    '*.cjs',
  ],
  rules: {
    '@typescript-eslint/no-explicit-any': 'warn',
    '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
    '@typescript-eslint/consistent-type-imports': [
      'warn',
      { fixStyle: 'inline-type-imports' },
    ],
  },
  overrides: [
    {
      files: ['**/*.test.ts', '**/*.spec.ts'],
      env: { node: true },
    },
    {
      files: ['**/*.tsx', '**/*.jsx'],
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
  ],
};
