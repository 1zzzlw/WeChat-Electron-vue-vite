import eslintConfig from '@electron-toolkit/eslint-config'
import eslintConfigPrettier from '@electron-toolkit/eslint-config-prettier'
import eslintPluginVue from 'eslint-plugin-vue'
import vueParser from 'vue-eslint-parser'
import tsParser from '@typescript-eslint/parser'
import tsPlugin from '@typescript-eslint/eslint-plugin'

export default [
  { ignores: ['**/node_modules/**', '**/dist/**', '**/out/**'] },
  eslintConfig,
  ...eslintPluginVue.configs['flat/essential'],
  {
    rules: {
      'no-unused-vars': ['warn', { args: 'none', caughtErrors: 'none', ignoreRestSiblings: true }]
    }
  },
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: { parser: tsParser }
  },
  {
    files: ['**/*.{ts,tsx,vue}'],
    plugins: { '@typescript-eslint': tsPlugin },
    rules: {
      ...tsPlugin.configs['eslint-recommended'].overrides[0].rules,
      'no-unused-vars': 'off',
      '@typescript-eslint/no-unused-vars': ['warn', {
        args: 'none', caughtErrors: 'none', ignoreRestSiblings: true
      }]
    }
  },
  {
    files: ['**/*.vue'],
    // Vue 中也有 JavaScript 脚本，不能一并关闭未定义变量检查。
    rules: { 'no-undef': 'error' },
    languageOptions: {
      parser: vueParser,
      parserOptions: {
        parser: tsParser,
        ecmaFeatures: {
          jsx: true
        },
        extraFileExtensions: ['.vue']
      }
    }
  },
  {
    files: ['**/*.{js,jsx,cjs,mjs,ts,tsx,vue}'],
    rules: {
      'vue/require-default-prop': 'off',
      'vue/multi-word-component-names': 'off'
    }
  },
  eslintConfigPrettier,
  {
    // 格式检查由 Prettier 独立执行，ESLint 保留代码正确性检查。
    rules: { 'prettier/prettier': 'off' }
  }
]
