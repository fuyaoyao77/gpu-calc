'use strict';

/** ESLint flat config（ESLint v9+） */
module.exports = [
  {
    files: ['**/*.js'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'script',
      globals: {
        // Node
        require: 'readonly',
        module: 'writable',
        process: 'readonly',
        __dirname: 'readonly',
        // Browser（index.html 内联脚本）
        document: 'readonly',
        window: 'readonly',
        navigator: 'readonly',
        alert: 'readonly',
        GpuCalc: 'readonly'
      }
    },
    rules: {
      'no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      'no-undef': 'error',
      semi: ['error', 'always'],
      quotes: ['error', 'single', { avoidEscape: true }],
      'no-constant-condition': 'error',
      eqeqeq: ['error', 'always']
    }
  },
  {
    files: ['test/**/*.js'],
    languageOptions: {
      globals: {
        // Node test runner
        test: 'readonly',
        assert: 'readonly'
      }
    }
  }
];
