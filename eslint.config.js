// @ts-check
const eslint = require('@eslint/js');
const tseslint = require('typescript-eslint');
const angular = require('angular-eslint');
const eslintPluginPrettierRecommended = require('eslint-plugin-prettier/recommended');

module.exports = tseslint.config(
    {
        files: ['**/*.ts'],
        languageOptions: {
            parserOptions: {
                projectService: true,
                tsconfigRootDir: __dirname,
            },
        },
        extends: [
            eslint.configs.recommended,
            ...tseslint.configs.recommended,
            ...tseslint.configs.stylistic,
            ...angular.configs.tsRecommended,
            eslintPluginPrettierRecommended,
        ],
        processor: angular.processInlineTemplates,
        rules: {
            '@angular-eslint/directive-selector': [
                'error',
                {
                    type: 'attribute',
                    prefix: 'app',
                    style: 'camelCase',
                },
            ],
            '@angular-eslint/component-selector': [
                'error',
                {
                    type: 'element',
                    prefix: 'app',
                    style: 'kebab-case',
                },
            ],
            'max-len': [
                'error',
                {
                    code: 150,
                    ignoreUrls: true,
                    ignorePattern: '^import\\s.+\\sfrom\\s.+;$',
                },
            ],
            'no-console': [
                'warn',
                {
                    allow: ['info', 'error'],
                },
            ],
            'lines-between-class-members': [
                'error',
                'always',
                {
                    exceptAfterSingleLine: true,
                },
            ],
            '@typescript-eslint/no-deprecated': 'warn',
            '@typescript-eslint/explicit-function-return-type': ['error'],
        },
    },
    {
        files: ['**/*.html'],
        extends: [...angular.configs.templateRecommended, ...angular.configs.templateAccessibility],
    },
);
