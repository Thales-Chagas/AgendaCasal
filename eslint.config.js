// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');
const prettierConfig = require('eslint-config-prettier');

const supabaseImports = {
  patterns: [
    {
      group: ['@supabase/*', '@/core/supabase', '@/core/supabase/*'],
      message: 'Esta camada não pode falar com o servidor. Use um repositório/hook da feature.',
    },
  ],
};

module.exports = defineConfig([
  expoConfig,
  prettierConfig,
  {
    ignores: ['dist/*', '.expo/*', 'android/*', 'ios/*', 'coverage/*'],
  },
  {
    rules: {
      'no-console': ['error', { allow: [] }],
      eqeqeq: ['error', 'always'],
      'import/no-default-export': 'off',
    },
  },
  {
    // O logger é o único lugar autorizado a usar console.
    files: ['src/core/logging/**'],
    rules: { 'no-console': 'off' },
  },
  {
    // REGRA DE PRIVACIDADE: notas privadas jamais podem importar o cliente do servidor.
    files: ['src/features/notes/**'],
    rules: { 'no-restricted-imports': ['error', supabaseImports] },
  },
  {
    // Telas e design system não acessam o banco diretamente.
    files: ['src/app/**', 'src/design-system/**'],
    rules: { 'no-restricted-imports': ['error', supabaseImports] },
  },
]);
