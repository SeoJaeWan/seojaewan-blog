import { spawnSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';

// @codocs [[Git 작업 규칙:Changesets]]
// 앱이나 패키지를 바꾼 PR에 changeset이 있는지 검사한다. CI(`ci.yml`)의 맨 앞 `Changeset` 작업이 쓴다.
// 어떤 파일이 changeset을 요구하는지는 `changeset status --since=<기준>`이 정한다(작업 공간 패키지, `.changeset/config.json`의 ignore).
// 경로 표를 따로 두지 않아 새 앱이 생겨도 이 스크립트를 고치지 않는다.

// 검사하지 않는 브랜치: 글 동기화 PR(Changesets 없이 바로 배포한다), Renovate(changeset 없이 머지되고 다음 배포 때 함께 나간다),
// 버전 PR(`chore/release`, Jenkins가 changeset을 소비해 만든다. deploy/version-pr.mjs).
const EXEMPT_BRANCH_PATTERN = /^(?:chore\/notion-content-sync|chore\/release|renovate\/.+)$/u;

/**
 * 브랜치가 changeset 검사에서 빠지는지 알려 준다.
 * @param {string} branch 브랜치 이름
 * @returns {boolean} 빠지면 true
 */
export function isExemptBranch(branch) {
  return EXEMPT_BRANCH_PATTERN.test(branch);
}

/**
 * `changeset status`에 넘길 인자를 만든다.
 * @param {string} base 기준 ref
 * @returns {string[]} `pnpm` 인자
 */
export function changesetStatusArgs(base) {
  return ['exec', 'changeset', 'status', `--since=${base}`];
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  const [, , branch = '', base = 'origin/main'] = process.argv;
  if (isExemptBranch(branch)) {
    console.log(`브랜치 "${branch}"은(는) changeset 검사에서 뺀다.`);
  } else {
    const result = spawnSync('pnpm', changesetStatusArgs(base), {
      stdio: 'inherit',
      // Windows에서 pnpm은 cmd 파일이라 셸을 거쳐야 실행된다.
      shell: process.platform === 'win32',
    });
    if (result.status !== 0) {
      console.error(
        '앱이나 패키지를 바꿨는데 changeset이 없다. `pnpm changeset`으로 만들어 함께 커밋한다. 규칙은 .codocs의 [[Git 작업 규칙:Changesets]]를 본다.',
      );
      process.exitCode = result.status ?? 1;
    }
  }
}
