import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

import {
  expiredFailureDirs,
  failureDirName,
  META_FILE,
  placeFailureReport,
  placeMainReport,
  pruneExpiredFailures,
  removeFailureReport,
  SITE_DOMAIN,
} from './scenario-pages.mjs';

const dayMs = 24 * 60 * 60 * 1000;
const now = new Date('2026-11-11T00:00:00Z');
const dirs = [];

/**
 * 임시 폴더를 만든다. 시험이 끝나면 지운다.
 * @returns {string} 폴더
 */
function tempDir() {
  const dir = mkdtempSync(path.join(tmpdir(), 'scenario-pages-'));
  dirs.push(dir);
  return dir;
}

/**
 * 폴더에 파일을 쓴다. 상위 폴더도 만든다.
 * @param {string} root 폴더
 * @param {Record<string, string>} files 경로 → 내용
 * @returns {string} 폴더
 */
function writeTree(root, files) {
  for (const [file, content] of Object.entries(files)) {
    mkdirSync(path.dirname(path.join(root, file)), { recursive: true });
    writeFileSync(path.join(root, file), content);
  }
  return root;
}

/**
 * 실패 폴더를 올린 때와 함께 만든다.
 * @param {string} site 사이트 폴더
 * @param {number} pr PR 번호
 * @param {Date} publishedAt 올린 때
 */
function writeFailure(site, pr, publishedAt) {
  writeTree(site, {
    [`failures/pr-${String(pr)}/index.html`]: 'pr',
    [`failures/pr-${String(pr)}/${META_FILE}`]: JSON.stringify({
      pr,
      publishedAt: publishedAt.toISOString(),
    }),
  });
}

afterEach(() => {
  for (const dir of dirs.splice(0)) {
    rmSync(dir, { recursive: true, force: true });
  }
});

// @codocs [[테스트 작성 규칙:E2E]]
describe('main 보고서 게시', () => {
  it('사이트 루트를 새 보고서로 바꾸고 실패 폴더는 남긴다', () => {
    const site = writeTree(tempDir(), {
      'index.html': 'old',
      'traces/old.zip': 'old',
      'failures/pr-3/index.html': 'pr3',
    });
    const report = writeTree(tempDir(), {
      'index.html': 'new',
      'history.json': '[]',
      'trace/index.html': 'viewer',
    });

    placeMainReport(site, report);

    expect(readFileSync(path.join(site, 'index.html'), 'utf8')).toBe('new');
    expect(existsSync(path.join(site, 'traces/old.zip'))).toBe(false);
    expect(existsSync(path.join(site, 'trace/index.html'))).toBe(true);
    expect(readFileSync(path.join(site, 'failures/pr-3/index.html'), 'utf8')).toBe('pr3');
    expect(readFileSync(path.join(site, 'CNAME'), 'utf8')).toBe(`${SITE_DOMAIN}\n`);
    expect(existsSync(path.join(site, '.nojekyll'))).toBe(true);
  });

  it('보고서에 사이트 자리와 같은 이름이 있으면 멈춘다', () => {
    const report = writeTree(tempDir(), { 'failures/x': 'x' });

    expect(() => placeMainReport(tempDir(), report)).toThrow('failures');
  });
});

// @codocs [[테스트 작성 규칙:E2E]]
describe('PR 실패 보고서 게시', () => {
  it('failures/pr-<번호>/에 두고 올린 때를 적으며 다른 폴더는 건드리지 않는다', () => {
    const site = writeTree(tempDir(), {
      'index.html': 'main',
      'failures/pr-3/index.html': 'pr3',
      'failures/pr-5/stale.txt': 'stale',
    });
    const report = writeTree(tempDir(), { 'index.html': 'pr5', 'traces/a.zip': 'zip' });

    const placed = placeFailureReport(site, report, 5, now);

    expect(placed).toBe('failures/pr-5/');
    expect(readFileSync(path.join(site, 'index.html'), 'utf8')).toBe('main');
    expect(readFileSync(path.join(site, 'failures/pr-3/index.html'), 'utf8')).toBe('pr3');
    expect(readFileSync(path.join(site, 'failures/pr-5/index.html'), 'utf8')).toBe('pr5');
    expect(existsSync(path.join(site, 'failures/pr-5/stale.txt'))).toBe(false);
    expect(JSON.parse(readFileSync(path.join(site, 'failures/pr-5', META_FILE), 'utf8'))).toEqual({
      pr: 5,
      publishedAt: now.toISOString(),
    });
    expect(existsSync(path.join(site, 'CNAME'))).toBe(true);
  });

  it('통과한 PR의 실패 폴더만 지운다', () => {
    const site = tempDir();
    writeFailure(site, 3, now);
    writeFailure(site, 5, now);

    expect(removeFailureReport(site, 5)).toBe(true);
    expect(removeFailureReport(site, 5)).toBe(false);
    expect(existsSync(path.join(site, 'failures/pr-3'))).toBe(true);
  });

  it.each([0, -1, 1.5, Number.NaN])('PR 번호 %s는 받지 않는다', (pr) => {
    expect(() => failureDirName(pr)).toThrow('PR 번호');
  });
});

// @codocs [[테스트 작성 규칙:E2E]]
describe('7일 지난 실패 폴더', () => {
  it('7일이 지났거나 올린 때를 읽지 못한 폴더를 지운다', () => {
    const site = tempDir();
    writeFailure(site, 1, new Date(now.getTime() - 8 * dayMs));
    writeFailure(site, 2, new Date(now.getTime() - 6 * dayMs));
    writeFailure(site, 3, new Date(now.getTime() - 7 * dayMs));
    writeTree(site, { 'failures/pr-4/index.html': 'meta 없음' });

    expect(expiredFailureDirs(site, now)).toEqual(['pr-1', 'pr-4']);
    expect(pruneExpiredFailures(site, now)).toEqual(['pr-1', 'pr-4']);
    expect(existsSync(path.join(site, 'failures/pr-1'))).toBe(false);
    expect(existsSync(path.join(site, 'failures/pr-2'))).toBe(true);
    expect(existsSync(path.join(site, 'failures/pr-3'))).toBe(true);
  });

  it('실패 폴더가 없으면 아무것도 지우지 않는다', () => {
    expect(pruneExpiredFailures(tempDir(), now)).toEqual([]);
  });
});
