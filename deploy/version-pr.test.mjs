import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { fakeRun } from './fake-run.mjs';
import { gitAuthEnv, RELEASE_BRANCH, runVersionPr } from './version-pr.mjs';

const TOKEN = 'ghs_secret-token';

let root = '';

/**
 * `.changeset` 폴더와 루트 package.json을 가진 임시 저장소를 만든다.
 * @param {string[]} changesets changeset 파일 이름
 */
function setUp(changesets) {
  mkdirSync(path.join(root, '.changeset'), { recursive: true });
  for (const name of ['README.md', 'config.json', ...changesets]) {
    writeFileSync(path.join(root, '.changeset', name), '');
  }
  writeFileSync(
    path.join(root, 'package.json'),
    JSON.stringify({ packageManager: 'pnpm@12.14.0' }),
  );
}

/**
 * 버전 커밋 앞뒤의 package.json을 흉내 낸다. 블로그만 0.0.0 → 0.1.0으로 오른다.
 * @param {string} line 명령 줄
 * @returns {{ stdout: string }} package.json 내용
 */
function showPackage(line) {
  const [, ref, file] = /git show (\S+?):(\S+)/u.exec(line) ?? [];
  const name = file?.split('/')[1] ?? '';
  const bumped = ref === 'HEAD' && name === 'web';
  return {
    stdout: JSON.stringify({ name: `@seojaewan/${name}`, version: bumped ? '0.1.0' : '0.0.0' }),
  };
}

/**
 * 버전 PR 만들기를 돌린다.
 * @param {{ rules?: [string, unknown][], openPulls?: { number: number }[] }} options 더할 규칙, 열린 버전 PR
 * @returns {Promise<{ outcome: string, calls: string[], requests: { method: string, route: string, body: unknown }[] }>} 결과, 부른 명령, API 요청
 */
async function versionPr({ rules = [], openPulls = [] } = {}) {
  // 앞의 규칙이 먼저 맞으므로 시험마다 더한 규칙을 앞에 둔다
  const { run, calls } = fakeRun([
    ...rules,
    ['git diff --name-only HEAD^1 HEAD', { stdout: 'apps/web/src/a.ts' }],
    ['git rev-parse HEAD^{tree}', { stdout: 'tree-new' }],
    ['git rev-parse HEAD', { stdout: 'c'.repeat(40) }],
    [
      'git show HEAD:apps/web/CHANGELOG.md',
      { stdout: '# @seojaewan/web\n\n## 0.1.0\n\n- 첫 배포\n' },
    ],
    ['git show HEAD:apps/images/CHANGELOG.md', { status: 1 }],
    ['git show HEAD:packages/design-system/CHANGELOG.md', { status: 1 }],
    ['git show', showPackage],
  ]);
  const requests = [];
  /**
   * GitHub API를 흉내 낸다.
   * @param {string} _token 토큰
   * @param {string} method 메서드
   * @param {string} route 경로
   * @param {unknown} body 본문
   * @returns {Promise<unknown>} 응답
   */
  async function api(_token, method, route, body) {
    requests.push({ method, route, body });
    return method === 'GET' ? openPulls : { number: 7 };
  }
  const outcome = await runVersionPr({ run, api, root, token: TOKEN, log: () => {} });
  return { outcome, calls, requests };
}

beforeEach(() => {
  root = mkdtempSync(path.join(tmpdir(), 'version-pr-'));
});

afterEach(() => {
  rmSync(root, { recursive: true, force: true });
});

// @codocs [[배포 환경:배포(CD)]]
// @codocs [[Git 작업 규칙:Changesets]]
describe('runVersionPr', () => {
  it('쌓인 changeset이 없으면 아무것도 하지 않는다', async () => {
    setUp([]);
    const { outcome, calls, requests } = await versionPr();
    expect(outcome).toBe('none');
    expect(calls).toEqual([]);
    expect(requests).toEqual([]);
  });

  it('글 동기화 병합에서는 버전 PR을 건드리지 않는다', async () => {
    setUp(['brave-cats.md']);
    const { outcome, calls } = await versionPr({
      rules: [['git diff --name-only HEAD^1 HEAD', { stdout: 'apps/web/content/notion.json' }]],
    });
    expect(outcome).toBe('content-only');
    expect(calls.some((line) => line.startsWith('git worktree add'))).toBe(false);
  });

  it('버전 커밋을 만들어 버전 브랜치에 올리고 PR을 연다', async () => {
    setUp(['brave-cats.md']);
    const { outcome, calls, requests } = await versionPr({
      rules: [['git rev-parse FETCH_HEAD^{tree}', { stdout: 'tree-old' }]],
    });
    expect(outcome).toBe('opened');
    expect(calls).toContain('npx --yes pnpm@12.14.0 exec changeset version');
    expect(calls).toContain('npx --yes pnpm@12.14.0 install --lockfile-only --ignore-scripts');
    expect(calls.some((line) => line.endsWith(`HEAD:refs/heads/${RELEASE_BRANCH}`))).toBe(true);
    const created = requests.find(({ method }) => method === 'POST');
    expect(created?.body).toMatchObject({ head: RELEASE_BRANCH, base: 'main' });
    expect(String(created?.body.body)).toContain('## @seojaewan/web 0.0.0 → 0.1.0\n\n- 첫 배포');
    expect(String(created?.body.body)).not.toContain('@seojaewan/images');
    // 토큰은 명령 인자에 들어가지 않는다
    expect(calls.join('\n')).not.toContain(TOKEN);
    // 끝나면 worktree를 지운다
    expect(calls.some((line) => line.startsWith('git worktree remove --force'))).toBe(true);
  });

  it('버전 커밋의 내용이 이미 올린 것과 같으면 올리지 않고 PR 본문만 갱신한다', async () => {
    setUp(['brave-cats.md']);
    const { outcome, calls, requests } = await versionPr({
      rules: [['git rev-parse FETCH_HEAD^{tree}', { stdout: 'tree-new' }]],
      openPulls: [{ number: 12 }],
    });
    expect(outcome).toBe('updated');
    expect(calls.some((line) => line.startsWith('git push'))).toBe(false);
    expect(requests.at(-1)).toMatchObject({ method: 'PATCH', route: '/pulls/12' });
  });
});

describe('gitAuthEnv', () => {
  it('토큰을 git 설정 환경 변수의 인증 머리로 넘긴다', () => {
    const env = gitAuthEnv(TOKEN);
    expect(env.GIT_CONFIG_KEY_0).toBe('http.https://github.com/.extraheader');
    expect(env.GIT_CONFIG_VALUE_0).toBe(
      `AUTHORIZATION: basic ${Buffer.from(`x-access-token:${TOKEN}`).toString('base64')}`,
    );
  });
});
