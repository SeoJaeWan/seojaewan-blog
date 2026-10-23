// @codocs [[피그마 연동:토큰 사용 강제]]
// 토큰(`@theme`)과 토큰 유틸리티(`@utility`)는 figma/tokens.json에서 만든 tokens.css에서만 정의한다.
// 다른 CSS에서 정의하면 피그마에 없는 값이 토큰처럼 쓰이므로 막는다.
const TOKENS_CSS = 'packages/design-system/src/tokens.css';

/** @type {import('stylelint').Config} */
const config = {
  // ignoreFiles를 정하면 node_modules 기본 제외가 꺼지므로 함께 적는다.
  ignoreFiles: [
    '**/node_modules/**',
    '**/.next/**',
    '**/dist/**',
    '**/storybook-static/**',
    '**/playwright-report/**',
    '**/coverage/**',
  ],
  rules: {
    'at-rule-disallowed-list': [
      ['theme', 'utility'],
      {
        message: (name) =>
          `${name}는 ${TOKENS_CSS}에서만 쓴다. 토큰은 피그마를 고치고 generate:tokens로 만든다.`,
      },
    ],
  },
  overrides: [
    {
      files: [TOKENS_CSS],
      rules: { 'at-rule-disallowed-list': null },
    },
  ],
};

export default config;
