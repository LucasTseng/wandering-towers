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
    // packages/ui 为 Phase 3 半成品，基于旧 API 不编译不接线，Phase C 重写。
    // 与 tsconfig 一致：不参与 lint，避免幻想代码阻断质量门禁。
    'packages/ui/**',
    // 法术死代码（cast-spell.ts + rules/spells/**）：基于不存在的旧 API，
    // 已被 engine tsconfig exclude。按决策保留隔离，Phase B 重写。lint 同步排除。
    'packages/engine/src/rules/cast-spell.ts',
    'packages/engine/src/rules/spells/**',
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
