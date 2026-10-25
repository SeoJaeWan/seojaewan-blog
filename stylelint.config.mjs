// @codocs [[피그마 연동:토큰 사용 강제]]
// 토큰(`@theme`)과 토큰 유틸리티(`@utility`)는 figma/tokens.json에서 만든 tokens.css에서만 정의한다.
// 다른 CSS에서 정의하면 피그마에 없는 값이 토큰처럼 쓰이므로 막는다.
const TOKENS_CSS = 'packages/design-system/src/tokens.css';
// @codocs [[기술 스택:스타일링]]
// 움직임(`@keyframes`와 motion-* 클래스를 만드는 `@utility`)은 손으로 쓰는 motion.css에서만 정의한다.
// motion.css의 `@utility` 이름이 motion-으로 시작하는지는 src/motion.test.ts가 지킨다.
const MOTION_CSS = 'packages/design-system/src/motion.css';

/**
 * 막는 at-rule의 오류 메시지를 만든다.
 * @param {string} name at-rule 이름
 * @returns {string} 메시지
 */
function disallowedMessage(name) {
  if (name === 'keyframes') {
    return `@keyframes는 ${MOTION_CSS}에서만 쓴다. 움직임은 motion-* 클래스로 둔다.`;
  }
  if (name === 'utility') {
    return `@utility는 ${TOKENS_CSS}(토큰 클래스)와 ${MOTION_CSS}(motion-* 클래스)에서만 쓴다.`;
  }
  return `${name}는 ${TOKENS_CSS}에서만 쓴다. 토큰은 피그마를 고치고 generate:tokens로 만든다.`;
}

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
    'at-rule-disallowed-list': [['theme', 'utility', 'keyframes'], { message: disallowedMessage }],
  },
  overrides: [
    {
      files: [TOKENS_CSS],
      rules: {
        'at-rule-disallowed-list': [['keyframes'], { message: disallowedMessage }],
      },
    },
    {
      files: [MOTION_CSS],
      rules: {
        'at-rule-disallowed-list': [['theme'], { message: disallowedMessage }],
      },
    },
  ],
};

export default config;
