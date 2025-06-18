const { defineConfig } = require('eslint/config');
const js = require('@eslint/js');
const nxPlugin = require('@nx/eslint-plugin');
const githubPlugin = require('eslint-plugin-github');
const perfectionistPlugin = require('eslint-plugin-perfectionist');
const prettierPluginRecommended = require('eslint-plugin-prettier/recommended');
const promisePlugin = require('eslint-plugin-promise');
const tsEslintPlugin = require('typescript-eslint');
const sonarjsPlugin = require('eslint-plugin-sonarjs');
const unicornPlugin = require('eslint-plugin-unicorn');
const commentsPlugin = require('@eslint-community/eslint-plugin-eslint-comments/configs');
const securityPlugin = require('eslint-plugin-security');
const globals = require('globals');
const jestFormattingPlugin = require('eslint-plugin-jest-formatting');
const jestAsyncPlugin = require('eslint-plugin-jest-async');
const ymlPlugin = require('eslint-plugin-yml');
const jestPlugin = require('eslint-plugin-jest');
const jsoncPlugin = require('eslint-plugin-jsonc');

const methodologies = ['bold'];
const ruleProcessorTypes = [
  'mass-id',
  'credit-order',
  'mass-id-certificate',
  'gas-id',
  'recycled-id',
];

const nxPluginConfigs = {
  plugins: {
    '@nx': nxPlugin,
  },
  rules: {
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
            onlyDependOnLibsWithTags: ['type:library'],
          },
          {
            sourceTag: 'type:library',
            onlyDependOnLibsWithTags: ['type:library'],
          },
          ...methodologies.map((methodology) => ({
            sourceTag: `methodology:${methodology}`,
            notDependOnLibsWithTags: [`/^methodology:(?!${methodology}$).*/`],
          })),
          ...ruleProcessorTypes.map((processorType) => ({
            sourceTag: `processor:${processorType}`,
            onlyDependOnLibsWithTags: [
              'processor:shared',
              `processor:${processorType}`,
              ...(processorType === 'gas-id' || processorType === 'recycled-id'
                ? ['processor:mass-id-certificate']
                : []),
              'type:library',
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
};

const ignorePatterns = {
  ignores: [
    '**/*', // Ignore all files by default. Overridden in .eslint/eslint.config.js with '!**/*' so lint-staged’s **/* pattern applies to all staged files.
    'node_modules',
    'coverage',
    'dist',
    'artifacts',
    'cache',
    'coverage.json',
    'local',
    'eslint.config.js',
  ],
};

const eslintJsConfigs = [
  {
    files: ['**/.eslint.config.js'],
    rules: {
      'sonarjs/cognitive-complexity': 'off',
      'sonarjs/no-duplicate-string': 'off',
    },
  },
];

const githubConfigs = [
  {
    files: ['**/*.{js,mjs,cjs,ts}'],
    rules: {
      'github/filenames-match-regex': [
        'error',
        '^[a-z0-9]+(-[a-z0-9]+)*(.[a-z0-9]+|.graphql)+$',
      ],
    },
  },
];

const tsFilesConfig = {
  files: ['**/*.ts'],
  plugins: {
    '@nx/typescript': nxPlugin,
  },
  languageOptions: {
    globals: {
      ...globals.node, // Adds process and other Node.js globals
    },
  },
  rules: {
    // TODO: fix the no-unused-vars rule
    'no-unused-vars': 'off',
    'import/no-namespace': 'off',
    'import/no-unresolved': 'off',
    'import/no-named-as-default': 'off',
    '@typescript-eslint/no-base-to-string': 'off',
    'sonarjs/function-return-type': 'off',
    '@typescript-eslint/no-unnecessary-condition': 'error',
    'class-methods-use-this': 'off',
    'i18n-text/no-en': 'off',
    'sonarjs/inconsistent-function-call': 'off',
    curly: ['error', 'all'],
    'no-void': 'off',
    'eslint-comments/disable-enable-pair': 'off',
    'import/prefer-default-export': 'off',
    'no-console': 'warn',
    'security/detect-non-literal-fs-filename': 'off',
    'unicorn/no-null': 'off',
    'sonarjs/todo-tag': 'off',
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
};

const tsAndJsFilesConfigs = {
  files: ['**/*.ts', '**/*.js'],
  rules: {
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
  },
};

const ymlFilesConfigs = {
  files: ['**/*.yml', '**/*.yaml'],
  ...ymlPlugin.configs['flat/standard'],
  ...ymlPlugin.configs['flat/prettier'],
};

const jsFilesConfigs = {
  files: ['**/*.js'],
  plugins: {
    '@nx/javascript': nxPlugin,
  },
};

const jestFilesConfigs = [
  {
    ...jestPlugin.configs['flat/recommended'],
    files: [
      '**/*.spec.ts',
      '**/*.spec.js',
      '**/typia.matchers.ts',
      '**/testing.helpers.ts',
    ],
    plugins: {
      'jest-formatting': jestFormattingPlugin,
      'jest-async': jestAsyncPlugin,
      jest: jestPlugin,
    },
    rules: {
      'sonarjs/no-nested-functions': 'off',
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
        {
          assertFunctionNames: ['expect', 'expectRequest', 'expectRuleOutput'],
        },
      ],
    },
  },
  {
    files: ['**/jest.config.ts'],
    languageOptions: {
      globals: {
        __dirname: 'readonly',
      },
    },
    rules: {
      '@nx/enforce-module-boundaries': 'off',
      'import/no-relative-packages': 'off',
    },
  },
];

const jsonFilesConfigs = {
  files: ['**/*.jsonc'],
  ...jsoncPlugin.configs['flat/recommended-with-json'],
  ...jsoncPlugin.configs['flat/prettier'],
};

module.exports = defineConfig([
  js.configs.recommended,
  nxPluginConfigs,
  ignorePatterns,
  ...tsEslintPlugin.configs.recommended,
  ...tsEslintPlugin.configs.recommendedTypeChecked.map((config) => ({
    ...config,
    rules: {
      ...config.rules,
    },
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: __dirname,
      },
    },
  })),
  githubPlugin.default.getFlatConfigs().recommended,
  ...githubConfigs,
  perfectionistPlugin.configs['recommended-natural'],
  prettierPluginRecommended,
  promisePlugin.configs['flat/recommended'],
  sonarjsPlugin.configs.recommended,
  ...eslintJsConfigs,
  unicornPlugin.default.configs.recommended,
  tsAndJsFilesConfigs,
  commentsPlugin.recommended,
  securityPlugin.configs.recommended,
  ...jestFilesConfigs,
  ymlFilesConfigs,
  jsonFilesConfigs,
  jsFilesConfigs,
  tsFilesConfig,
]);
