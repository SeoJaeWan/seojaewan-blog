// @codocs [[Git 작업 규칙:Git 훅]]
// 바뀐 파일만 lint·포맷한다. 전체 검사는 CI에서 한다.
const config = {
  '*.{ts,tsx,js,mjs,cjs}': ['eslint --fix --max-warnings=0', 'prettier --write'],
  '*.{json,css,md,yaml,yml}': 'prettier --write',
};

export default config;
