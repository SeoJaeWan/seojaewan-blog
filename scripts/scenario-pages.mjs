import {
  cpSync,
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

// @codocs [[테스트 작성 규칙:E2E]]
// 시나리오 케이스 보고서를 올리는 GitHub Pages 사이트(`gh-pages` 브랜치를 풀어 둔 폴더)를 고친다.
// `publish-scenario-pages.sh`가 브랜치를 받아 이 스크립트로 폴더를 고친 뒤 커밋 하나로 다시 올린다.
// - main: 사이트 루트를 `main` 보고서로 바꾸고, 실패 폴더(`failures/`)는 두며, 7일 지난 PR 실패 폴더를 지운다.
// - failure: `failures/pr-<번호>/`에 PR 실패 보고서를 두고, 올린 때를 폴더 안 `published.json`에 적는다.
// - clear: 통과한 PR의 실패 폴더를 지운다.
// 어느 명령도 자기 자리 밖의 폴더(`main` 보고서, 다른 PR의 실패 폴더)를 지우지 않는다.

/** 사이트 주소(GitHub Pages 커스텀 도메인). 사이트 루트의 `CNAME`에 적는다 */
export const SITE_DOMAIN = 'scenario-cases.seojaewan.com';
/** PR 실패 보고서를 두는 폴더 */
export const FAILURES_DIR = 'failures';
/** 실패 폴더 안에 올린 때를 적는 파일 */
export const META_FILE = 'published.json';
/** PR 실패 폴더를 남기는 기간 */
export const failureKeepMs = 7 * 24 * 60 * 60 * 1000;
/** `main` 보고서로 바꿀 때 사이트 루트에서 남기는 것 */
const siteFiles = new Set([FAILURES_DIR, 'CNAME', '.nojekyll']);

/**
 * PR 실패 폴더 이름을 만든다.
 * @param {number} pr PR 번호
 * @returns {string} `pr-<번호>`
 */
export function failureDirName(pr) {
  if (!Number.isInteger(pr) || pr <= 0) {
    throw new Error(`PR 번호가 아니다: ${String(pr)}`);
  }
  return `pr-${String(pr)}`;
}

/**
 * 사이트 공통 파일을 둔다. 커스텀 도메인(`CNAME`)과, Jekyll이 `_`로 시작하는 파일을 빼지 않게 하는 `.nojekyll`이다.
 * @param {string} siteDir 사이트 폴더
 */
export function writeSiteFiles(siteDir) {
  mkdirSync(siteDir, { recursive: true });
  writeFileSync(path.join(siteDir, 'CNAME'), `${SITE_DOMAIN}\n`);
  writeFileSync(path.join(siteDir, '.nojekyll'), '');
}

/**
 * 사이트 루트를 `main` 보고서로 바꾼다. 실패 폴더와 사이트 공통 파일은 남긴다.
 * @param {string} siteDir 사이트 폴더
 * @param {string} reportDir 새 보고서 폴더
 */
export function placeMainReport(siteDir, reportDir) {
  mkdirSync(siteDir, { recursive: true });
  for (const entry of readdirSync(siteDir)) {
    if (!siteFiles.has(entry)) {
      rmSync(path.join(siteDir, entry), { recursive: true, force: true });
    }
  }
  for (const entry of readdirSync(reportDir)) {
    if (siteFiles.has(entry)) {
      throw new Error(`보고서에 사이트 자리(${entry})와 같은 이름이 있다`);
    }
    cpSync(path.join(reportDir, entry), path.join(siteDir, entry), { recursive: true });
  }
  writeSiteFiles(siteDir);
}

/**
 * PR 실패 보고서를 `failures/pr-<번호>/`에 둔다. 그 PR의 이전 실패 보고서는 바꾼다.
 * @param {string} siteDir 사이트 폴더
 * @param {string} reportDir 새 보고서 폴더
 * @param {number} pr PR 번호
 * @param {Date} now 올린 때
 * @returns {string} 사이트 기준 경로(`failures/pr-<번호>/`)
 */
export function placeFailureReport(siteDir, reportDir, pr, now) {
  const relative = `${FAILURES_DIR}/${failureDirName(pr)}`;
  const target = path.join(siteDir, relative);
  rmSync(target, { recursive: true, force: true });
  mkdirSync(path.dirname(target), { recursive: true });
  cpSync(reportDir, target, { recursive: true });
  writeFileSync(
    path.join(target, META_FILE),
    JSON.stringify({ pr, publishedAt: now.toISOString() }),
  );
  writeSiteFiles(siteDir);
  return `${relative}/`;
}

/**
 * PR의 실패 보고서를 지운다.
 * @param {string} siteDir 사이트 폴더
 * @param {number} pr PR 번호
 * @returns {boolean} 지운 것이 있으면 true
 */
export function removeFailureReport(siteDir, pr) {
  const target = path.join(siteDir, FAILURES_DIR, failureDirName(pr));
  if (!existsSync(target)) {
    return false;
  }
  rmSync(target, { recursive: true, force: true });
  return true;
}

/**
 * 남기는 기간이 지난 PR 실패 폴더를 고른다. 올린 때(`published.json`)를 읽지 못한 폴더도 고른다.
 * @param {string} siteDir 사이트 폴더
 * @param {Date} now 지금
 * @param {number} [keepMs] 남기는 기간
 * @returns {string[]} 폴더 이름(`pr-<번호>`)
 */
export function expiredFailureDirs(siteDir, now, keepMs = failureKeepMs) {
  const failuresDir = path.join(siteDir, FAILURES_DIR);
  if (!existsSync(failuresDir)) {
    return [];
  }
  return readdirSync(failuresDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && /^pr-\d+$/u.test(entry.name))
    .map((entry) => entry.name)
    .filter((name) => {
      try {
        const meta = JSON.parse(readFileSync(path.join(failuresDir, name, META_FILE), 'utf8'));
        const published = Date.parse(meta.publishedAt);
        return Number.isNaN(published) || now.getTime() - published > keepMs;
      } catch {
        return true;
      }
    })
    .sort();
}

/**
 * 남기는 기간이 지난 PR 실패 폴더를 지운다.
 * @param {string} siteDir 사이트 폴더
 * @param {Date} now 지금
 * @returns {string[]} 지운 폴더 이름
 */
export function pruneExpiredFailures(siteDir, now) {
  const expired = expiredFailureDirs(siteDir, now);
  for (const name of expired) {
    rmSync(path.join(siteDir, FAILURES_DIR, name), { recursive: true, force: true });
  }
  return expired;
}

/**
 * PR 번호 인자를 읽는다.
 * @param {string | undefined} value 인자
 * @returns {number} PR 번호
 */
function prArg(value) {
  const pr = Number(value);
  failureDirName(pr);
  return pr;
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  const [, , command, siteDir, ...rest] = process.argv;
  const now = new Date();
  if (command === 'main' && siteDir && rest[0]) {
    placeMainReport(siteDir, rest[0]);
    const pruned = pruneExpiredFailures(siteDir, now);
    console.log(
      `main 보고서를 사이트 루트에 두었다. 7일 지난 실패 폴더 ${String(pruned.length)}개를 지웠다${pruned.length > 0 ? `: ${pruned.join(', ')}` : ''}.`,
    );
  } else if (command === 'failure' && siteDir && rest[0]) {
    const placed = placeFailureReport(siteDir, rest[0], prArg(rest[1]), now);
    console.log(`PR 실패 보고서를 ${placed}에 두었다.`);
  } else if (command === 'clear' && siteDir) {
    const pr = prArg(rest[0]);
    const removed = removeFailureReport(siteDir, pr);
    console.log(
      removed ? `PR #${String(pr)}의 실패 폴더를 지웠다.` : `PR #${String(pr)}의 실패 폴더가 없다.`,
    );
  } else {
    console.error(
      [
        '사용법:',
        '  node scripts/scenario-pages.mjs main <사이트 폴더> <보고서 폴더>',
        '  node scripts/scenario-pages.mjs failure <사이트 폴더> <보고서 폴더> <PR 번호>',
        '  node scripts/scenario-pages.mjs clear <사이트 폴더> <PR 번호>',
      ].join('\n'),
    );
    process.exitCode = 2;
  }
}
