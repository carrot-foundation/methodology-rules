const methodologies = ['bold'];
const ruleProcessorTypes = [
  'mass-id',
  'credit-order',
  'mass-id-certificate',
  'gas-id',
  'recycled-id',
];

module.exports = {
  root: true,
  ignorePatterns: ['**/*'],
  plugins: ['@nx', 'github', 'perfectionist', 'promise'],
  extends: [
    'airbnb-base',
    'eslint:recommended',
    'plugin:eslint-comments/recommended',
    'plugin:github/recommended',
    'plugin:perfectionist/recommended-natural',
    'plugin:promise/recommended',
    'plugin:prettier/recommended',
    'plugin:security/recommended-legacy',
    'plugin:sonarjs/recommended',
    'plugin:unicorn/recommended',
  ],
  rules: {
    'eol-last': ['error', 'always'],
    'no-restricted-syntax': 'off',
    'filenames/match-regex': ['error', '^[a-z][a-z0-9]+(-[a-z]+)*(.[a-z]+)+$'],
  },
  overrides: [
    {
      files: ['*.ts', '*.tsx', '*.js', '*.jsx'],
      rules: {
        'class-methods-use-this': 'off',
        'i18n-text/no-en': 'off',
        curly: ['error', 'all'],
        'no-void': 'off',
        'eslint-comments/disable-enable-pair': 'off',
        'import/prefer-default-export': 'off',
        'no-console': 'warn',
        'security/detect-non-literal-fs-filename': 'off',
        'unicorn/no-null': 'off',
        'unicorn/prefer-module': 'off',
        'unicorn/prefer-top-level-await': 'off',
        'unicorn/prevent-abbreviations': [
          'error',
          {
            allowList: {
              props: true,
              Props: true,
            },
            replacements: { e: false, lib: false },
          },
        ],
        'arrow-body-style': ['warn', 'as-needed'],
        'padding-line-between-statements': [
          'warn',
          { blankLine: 'always', prev: '*', next: 'block-like' },
          { blankLine: 'any', prev: 'case', next: 'case' },
          { blankLine: 'always', prev: '*', next: 'return' },
          {
            blankLine: 'always',
            prev: ['const', 'let', 'var'],
            next: '*',
          },
          {
            blankLine: 'any',
            prev: ['const', 'let', 'var'],
            next: ['const', 'let', 'var'],
          },
        ],
        '@nx/enforce-module-boundaries': [
          'error',
          {
            allow: [],
            depConstraints: [
              {
                sourceTag: 'app:any',
                onlyDependOnLibsWithTags: ['app:any'],
                notDependOnLibsWithTags: ['/^app:(^any)+$/'],
              },
              {
                sourceTag: 'type:app',
                onlyDependOnLibsWithTags: ['type:lib'],
              },
              {
                sourceTag: 'type:lib',
                onlyDependOnLibsWithTags: ['type:lib'],
              },
              ...methodologies.map((methodology) => ({
                sourceTag: `methodology:${methodology}`,
                notDependOnLibsWithTags: [
                  `/^methodology:(?!${methodology}$).*/`,
                ],
              })),
              ...ruleProcessorTypes.map((processorType) => ({
                sourceTag: `processor:${processorType}`,
                onlyDependOnLibsWithTags: [
                  'processor:shared',
                  `processor:${processorType}`,
                  ...(processorType === 'gas-id' ||
                  processorType === 'recycled-id'
                    ? ['processor:mass-id-certificate']
                    : []),
                  'type:lib',
                ],
              })),
              {
                sourceTag: 'scope:shared',
                onlyDependOnLibsWithTags: ['scope:shared'],
              },
            ],
          },
        ],
      },
    },
    {
      files: ['*.ts', '*.tsx'],
      extends: [
        'airbnb-typescript/base',
        'plugin:@nx/typescript',
        'plugin:@typescript-eslint/recommended',
        'plugin:@typescript-eslint/recommended-requiring-type-checking',
      ],
      rules: {
        '@typescript-eslint/no-unnecessary-condition': 'error',
        '@typescript-eslint/no-useless-template-literals': 'error',
        '@typescript-eslint/strict-boolean-expressions': [
          'error',
          {
            allowNullableObject: true,
            allowNullableString: true,
          },
        ],
        '@typescript-eslint/ban-ts-comment': [
          'error',
          {
            'ts-expect-error': 'allow-with-description',
          },
        ],
      },
    },
    {
      files: ['*.js', '*.jsx'],
      extends: ['plugin:@nx/javascript'],
      rules: {},
    },
    {
      files: ['jest.config.ts'],
      rules: {
        '@nx/enforce-module-boundaries': 'off',
        'import/no-relative-packages': 'off',
      },
    },
    {
      files: ['*.dtos.ts'],
      rules: {
        'max-classes-per-file': 'off',
      },
    },
    {
      files: ['*.spec.ts', '*.spec.tsx', '*.spec.js', '*.spec.jsx'],
      plugins: ['jest-formatting', 'jest-async'],
      extends: [
        'plugin:jest-formatting/recommended',
        'plugin:jest/recommended',
      ],
      env: {
        jest: true,
      },
      rules: {
        'jest-async/expect-return': 'error',
        '@typescript-eslint/no-unsafe-assignment': 'off',
        'global-require': 'off',
        '@typescript-eslint/unbound-method': 'off',
        '@typescript-eslint/consistent-type-assertions': 'off',
        '@typescript-eslint/no-explicit-any': 'off',
        '@typescript-eslint/no-non-null-assertion': 'off',
        '@typescript-eslint/no-var-requires': 'off',
        'security/detect-object-injection': 'off',
        'sonarjs/cognitive-complexity': 'off',
        'sonarjs/no-duplicate-string': 'off',
        'unicorn/no-useless-undefined': 'off',
        'unicorn/prefer-module': 'off',
        'no-await-in-loop': 'off',
        'no-restricted-syntax': 'off',
        'max-classes-per-file': 'off',
        'import/no-namespace': 'off',
        '@typescript-eslint/dot-notation': 'off',
        'jest/expect-expect': [
          'error',
          { assertFunctionNames: ['expect', 'expectRequest'] },
        ],
      },
    },
    {
      files: ['*.yaml', '*.yml'],
      parser: 'yaml-eslint-parser',
      extends: ['plugin:yml/standard', 'plugin:yml/prettier'],
    },
    {
      files: ['*.json'],
      parser: 'jsonc-eslint-parser',
      extends: ['plugin:jsonc/recommended-with-json', 'plugin:jsonc/prettier'],
    },
  ],
};
