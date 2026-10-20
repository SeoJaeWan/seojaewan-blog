// @codocs [[Git 작업 규칙:커밋]]
// Conventional Commits 형식이고 제목은 영어로 쓴다. 본문 언어(한국어)는 검사하지 않는다.
const NON_ASCII = /[^ -~]/u;

/** @type {import('@commitlint/types').UserConfig} */
const config = {
  extends: ['@commitlint/config-conventional'],
  plugins: [
    {
      rules: {
        'subject-english': (parsed) => {
          const subject = parsed.subject ?? '';
          return [
            !NON_ASCII.test(subject),
            '커밋 제목(subject)은 영어로 쓴다. 본문은 한국어로 쓴다.',
          ];
        },
      },
    },
  ],
  rules: {
    'subject-english': [2, 'always'],
    'body-max-line-length': [0],
  },
};

export default config;
