import { pathToFileURL } from 'node:url';
import conventional from '@commitlint/config-conventional';

// @codocs [[Git 작업 규칙:브랜치]]
// 브랜치 이름이 `종류/짧은-설명` 형식인지 검사한다. CI(`Branch name` 작업)와 pre-push 훅이 함께 쓴다.
// 종류는 커밋 종류와 같은 단어라서 commitlint가 확장하는 설정의 type-enum에서 읽어 온다(목록을 따로 적지 않는다).
// 피그마 플러그인이 여는 고정 이름(`feat/figma-...`)도 이 형식이다.
const [, , commitTypes] = conventional.rules['type-enum'];

const branchPattern = new RegExp(`^(?:${commitTypes.join('|')})/[a-z0-9]+(?:-[a-z0-9]+)*$`, 'u');
// 형식을 따르지 않지만 막으면 안 되는 이름: 기본 브랜치, Renovate가 여는 의존성 갱신 브랜치(`renovate/...`).
const EXEMPT_PATTERN = /^(?:main|renovate\/.+)$/u;

/**
 * 브랜치 이름이 규칙에 맞는지 알려 준다.
 * @param {string} name 브랜치 이름(`refs/heads/` 없이)
 * @returns {boolean} 맞으면 true
 */
export function isValidBranchName(name) {
  return EXEMPT_PATTERN.test(name) || branchPattern.test(name);
}

/**
 * 규칙에 맞지 않을 때 보여 줄 한국어 메시지를 만든다.
 * @param {string} name 브랜치 이름
 * @returns {string} 실패 메시지
 */
export function branchNameMessage(name) {
  return [
    `브랜치 이름 "${name}"이(가) 규칙에 맞지 않는다.`,
    `형식은 \`종류/짧은-설명\`이다. 종류: ${commitTypes.join(', ')}. 설명은 소문자·숫자·하이픈이다. 예: feat/taskbar-pin`,
    '자세한 규칙은 .codocs의 [[Git 작업 규칙:브랜치]]를 본다.',
  ].join('\n');
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  const names = process.argv.slice(2);
  if (names.length === 0) {
    console.error('사용법: node scripts/check-branch-name.mjs <브랜치 이름>...');
    process.exitCode = 2;
  }
  for (const name of names) {
    if (!isValidBranchName(name)) {
      console.error(branchNameMessage(name));
      process.exitCode = 1;
    }
  }
}
