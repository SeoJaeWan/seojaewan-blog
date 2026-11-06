import { execFileSync, spawnSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';

// @codocs [[Git 작업 규칙:Changesets]]
// 앱이나 패키지를 바꾼 PR에 changeset이 있는지 검사한다. CI의 `Lint, typecheck, test, build` 작업이 쓴다.
// 배포에 영향이 있는 파일이 바뀐 PR에만 `changeset status`를 돌려 changeset이 빠졌으면 실패시킨다.

// 검사하지 않는 브랜치: 글 동기화 PR(Changesets 없이 바로 배포한다), Renovate(changeset 없이 머지되고 다음 배포 때 함께 나간다),
// 버전 PR(Jenkins가 changeset을 소비해 만든다).
const EXEMPT_BRANCH_PATTERN =
  /^(?:chore\/notion-content-sync|renovate\/.+|changeset-release\/.+)$/u;
// 버전을 관리하는 곳(배포 대상 앱과 패키지). `tools/*`는 버전 관리에서 뺐다(.changeset/config.json의 ignore).
const RELEASE_DIR_PATTERN = /^(?:apps\/(?:web|images)|packages\/[^/]+)\//u;
// 그 안에서도 배포에 영향이 없는 파일: 문서(`*.md`)와 글 JSON(`apps/web/content/**`, 글만 바뀐 병합은 따로 배포한다).
const NO_EFFECT_PATTERN = /(?:\.md$|^apps\/web\/content\/)/u;

/**
 * 브랜치가 changeset 검사에서 빠지는지 알려 준다.
 * @param {string} branch 브랜치 이름
 * @returns {boolean} 빠지면 true
 */
export function isExemptBranch(branch) {
  return EXEMPT_BRANCH_PATTERN.test(branch);
}

/**
 * 바뀐 파일 중 changeset이 필요한 것이 있는지 알려 준다.
 * @param {string[]} files 바뀐 파일 경로(저장소 루트 기준)
 * @returns {boolean} 있으면 true
 */
export function needsChangeset(files) {
  return files.some((file) => RELEASE_DIR_PATTERN.test(file) && !NO_EFFECT_PATTERN.test(file));
}

/**
 * 기준 브랜치와 갈라진 뒤 바뀐 파일을 읽는다.
 * @param {string} base 기준 ref
 * @returns {string[]} 바뀐 파일 경로
 */
function changedFiles(base) {
  const output = execFileSync('git', ['diff', '--name-only', `${base}...HEAD`], {
    encoding: 'utf8',
  });
  return output.split('\n').filter(Boolean);
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  const [, , branch = '', base = 'origin/main'] = process.argv;
  if (isExemptBranch(branch)) {
    console.log(`브랜치 "${branch}"은(는) changeset 검사에서 뺀다.`);
  } else if (needsChangeset(changedFiles(base))) {
    const result = spawnSync('pnpm', ['exec', 'changeset', 'status', `--since=${base}`], {
      stdio: 'inherit',
    });
    if (result.status !== 0) {
      console.error(
        '앱이나 패키지를 바꿨는데 changeset이 없다. `pnpm changeset`으로 만들어 함께 커밋한다. 규칙은 .codocs의 [[Git 작업 규칙:Changesets]]를 본다.',
      );
      process.exitCode = result.status ?? 1;
    }
  } else {
    console.log('배포에 영향이 있는 파일이 바뀌지 않아 changeset 검사를 건너뛴다.');
  }
}
