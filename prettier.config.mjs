// @codocs [[코드 작성 규칙:포맷]]
/** @type {import('prettier').Config} */
const config = {
  singleQuote: true,
  semi: true,
  trailingComma: 'all',
  printWidth: 100,
  tabWidth: 2,
  endOfLine: 'lf',
  plugins: ['prettier-plugin-tailwindcss'],
  overrides: [
    {
      files: 'apps/web/**',
      options: { tailwindStylesheet: './apps/web/src/app/globals.css' },
    },
    {
      files: 'packages/design-system/**',
      options: { tailwindStylesheet: './packages/design-system/.storybook/preview.css' },
    },
  ],
};

export default config;
