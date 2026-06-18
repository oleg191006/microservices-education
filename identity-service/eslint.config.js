const airbnbBase = require('eslint-config-airbnb-base');
const importPlugin = require('eslint-plugin-import');
const eslintConfigPrettier = require('eslint-config-prettier');

const mainConfig = {
    languageOptions: {
        ecmaVersion: 'latest',
        sourceType: 'script',
    },

    plugins: {
        import: importPlugin,
    },

    rules: {
        ...airbnbBase.rules,

        // ─── Порожні рядки ────────────────────────────────────
        'no-multiple-empty-lines': ['error', { max: 1, maxEOF: 0, maxBOF: 0 }],
        'padded-blocks': ['error', 'never'],
        'padding-line-between-statements': [
            'error',
            // порожній рядок перед return
            { blankLine: 'always', prev: '*', next: 'return' },
            // порожній рядок після require/import блоку
            { blankLine: 'always', prev: ['const', 'let'], next: '*' },
            {
                blankLine: 'any',
                prev: ['const', 'let'],
                next: ['const', 'let'],
            },
        ],

        // ─── Які правила пом'якшені для Node.js ──────────────
        'no-console': 'warn',
        'import/no-extraneous-dependencies': 'off',
    },
};

module.exports = [mainConfig, eslintConfigPrettier];
