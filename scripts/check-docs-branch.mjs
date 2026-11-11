import { execFileSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';

// @codocs [[Git 작업 규칙:브랜치]]
// `docs/` 브랜치의 PR이 문서만 바꿨는지 검사한다. `branch-name.yml`이 쓴다.
// `docs/` PR에서는 CI(`ci.yml`)가 돌지 않으므로, 코드가 섞여 검사 없이 병합되지 않게 막는다.

/** 문서 브랜치로 보는 이름 */
const DOCS_BRANCH_PATTERN = /^docs\//u;
/** 허용하는 폴더(저장소 루트 기준, 아래 전부) */
const allowedDirs = ['.codocs/', '.claude/'];
/** 어느 폴더에 있든 허용하는 파일 이름 */
const allowedNames = new Set(['AGENTS.md', 'CLAUDE.md', 'README.md']);

/**
 * 문서 브랜치인지 알려 준다.
 * @param {string} branch 브랜치 이름
 * @returns {boolean} `docs/`로 시작하면 true
 */
export function isDocsBranch(branch) {
  return DOCS_BRANCH_PATTERN.test(branch);
}

/**
 * 파일이 문서 브랜치에서 바꿔도 되는 파일인지 알려 준다.
 * @param {string} file 저장소 루트 기준 경로(`/`로 잇는다)
 * @returns {boolean} 허용하면 true
 */
export function isAllowedDocsFile(file) {
  const name = file.slice(file.lastIndexOf('/') + 1);
  return allowedDirs.some((dir) => file.startsWith(dir)) || allowedNames.has(name);
}

/**
 * 문서 브랜치에서 바꾸면 안 되는 파일을 고른다.
 * @param {string[]} files PR이 바꾼 파일(추가·수정·삭제, 이름 변경은 옛 경로와 새 경로 모두)
 * @returns {string[]} 허용 범위 밖의 파일
 */
export function disallowedDocsFiles(files) {
  return files.filter((file) => !isAllowedDocsFile(file));
}

/**
 * 허용 범위 밖의 파일이 있을 때 보여 줄 한국어 메시지를 만든다.
 * @param {string} branch 브랜치 이름
 * @param {string[]} files 허용 범위 밖의 파일
 * @returns {string} 실패 메시지
 */
export function docsBranchMessage(branch, files) {
  return [
    `\`docs/\` 브랜치 "${branch}"이(가) 문서가 아닌 파일을 바꿨다.`,
    '`docs/` 브랜치의 PR에서는 CI가 돌지 않아, 문서만 바꿀 수 있다. 허용하는 파일: `.codocs/`·`.claude/` 아래 전부, 어느 폴더에 있든 `AGENTS.md`·`CLAUDE.md`·`README.md`.',
    '허용 범위 밖의 파일:',
    ...files.map((file) => `  - ${file}`),
    '이 파일을 바꿔야 하면 다른 종류의 브랜치(`fix/`, `chore/` 등)로 올려 CI 검사를 받는다. 규칙은 .codocs의 [[Git 작업 규칙:브랜치]]를 본다.',
  ].join('\n');
}

/**
 * 두 커밋 사이에 바뀐 파일을 읽는다. 이름 변경은 옛 경로와 새 경로를 모두 낸다.
 * @param {string} base 기준 커밋
 * @param {string} head 비교할 커밋
 * @returns {string[]} 바뀐 파일 경로
 */
function changedFiles(base, head) {
  const output = execFileSync('git', ['diff', '--no-renames', '--name-only', base, head], {
    encoding: 'utf8',
  });
  return output.split('\n').filter(Boolean);
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  const [, , branch = '', base = 'HEAD^1', head = 'HEAD'] = process.argv;
  if (!isDocsBranch(branch)) {
    console.log(`브랜치 "${branch}"은(는) 문서 브랜치가 아니라 파일 검사를 건너뛴다.`);
  } else {
    const outside = disallowedDocsFiles(changedFiles(base, head));
    if (outside.length > 0) {
      console.error(docsBranchMessage(branch, outside));
      process.exitCode = 1;
    } else {
      console.log(`브랜치 "${branch}"은(는) 문서만 바꿨다.`);
    }
  }
}
