import { appendFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

// @codocs [[Git 작업 규칙:CI]]
// CI(`ci.yml`)를 돌릴지 정한다. 버전 PR(`chore/release`), 문서 PR(`docs/*`), 글 동기화 PR(`chore/notion-content-sync`)에서는
// 돌지 않고, 그 PR이 병합된 `main` push에서도 돌지 않는다.
// push 이벤트에는 PR 브랜치 이름이 없어, 병합 커밋 제목(`Merge pull request #N from <owner>/<branch>`)에서 읽는다.
// 브랜치를 읽지 못한 push(직접 push 등)는 돈다.

/** CI를 돌리지 않는 PR 브랜치 */
const SKIP_BRANCH_PATTERN = /^(?:chore\/release|docs\/.+|chore\/notion-content-sync)$/u;
/** GitHub가 만드는 병합 커밋 제목. 소유자 뒤 첫 `/` 다음이 브랜치다 */
const MERGE_TITLE_PATTERN = /^Merge pull request #\d+ from [^/\s]+\/(\S+)/u;

/**
 * 브랜치에서 CI를 건너뛰는지 알려 준다.
 * @param {string} branch PR 브랜치 이름
 * @returns {boolean} 건너뛰면 true
 */
export function isSkippedBranch(branch) {
  return SKIP_BRANCH_PATTERN.test(branch);
}

/**
 * 병합 커밋 메시지에서 PR 브랜치 이름을 읽는다.
 * @param {string} message 커밋 메시지(제목과 본문)
 * @returns {string | null} 브랜치 이름. 병합 커밋 제목이 아니면 null
 */
export function mergedBranchOf(message) {
  const title = message.split('\n', 1)[0] ?? '';
  return MERGE_TITLE_PATTERN.exec(title)?.[1] ?? null;
}

/**
 * CI를 돌릴지 정한다.
 * @param {{ eventName: string, headRef?: string, headCommitMessage?: string }} event 이벤트
 * @returns {boolean} 돌리면 true
 */
export function shouldRunCi({ eventName, headRef = '', headCommitMessage = '' }) {
  if (eventName === 'pull_request') {
    return !isSkippedBranch(headRef);
  }
  const branch = mergedBranchOf(headCommitMessage);
  return branch === null || !isSkippedBranch(branch);
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  const run = shouldRunCi({
    eventName: process.env.EVENT_NAME ?? '',
    headRef: process.env.HEAD_REF,
    headCommitMessage: process.env.HEAD_COMMIT_MESSAGE,
  });
  console.log(
    run ? 'CI를 돌린다.' : '이 브랜치(또는 이 브랜치를 병합한 push)에서는 CI를 돌리지 않는다.',
  );
  if (process.env.GITHUB_OUTPUT) {
    appendFileSync(process.env.GITHUB_OUTPUT, `run=${String(run)}\n`);
  }
}
