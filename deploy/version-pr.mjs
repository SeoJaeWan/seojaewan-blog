import { mkdtempSync, readdirSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

import {
  changelogSection,
  isContentOnly,
  pendingChangesets,
  versionPrBody,
} from './release-plan.mjs';
import { runCommand } from './run-command.mjs';

// @codocs [[배포 환경:배포(CD)]]
// @codocs [[Git 작업 규칙:Changesets]]
// main에 changeset이 쌓여 있으면 버전 PR을 만들거나 갱신한다. changesets/action과 같은 일을 젠킨스에서 한다.
// 버전 커밋은 따로 만든 worktree에서 만든다. 같은 실행의 배포 판단은 젠킨스가 체크아웃한 main 커밋으로만 하기 때문이다.

/** 저장소 */
export const REPOSITORY = 'SeoJaeWan/seojaewan-blog';
/** 버전 PR 브랜치. `종류/설명` 형식이라 Branch name 검사를 통과하고, changeset 검사에서는 뺀다 */
export const RELEASE_BRANCH = 'chore/release';
/** 버전 PR 제목 */
export const RELEASE_TITLE = 'chore(release): 버전 올리기';
/** 버전을 관리하는 패키지(.changeset/config.json에서 ignore하지 않은 것) */
export const versionedPackages = ['apps/web', 'apps/images', 'packages/design-system'];
/** 버전 커밋의 작성자. 저장소의 커밋 작성자 규칙([[Git 작업 규칙:커밋]])을 따른다 */
export const releaseAuthor = {
  name: 'Ing-yeo_Developer',
  email: '52366178+SeoJaeWan@users.noreply.github.com',
};

/**
 * GitHub에 인증하는 git 설정을 환경 변수로 만든다. 토큰을 명령 인자나 원격 주소에 넣지 않아 로그와 오류 메시지에 남지 않는다.
 * @param {string} token GitHub App 설치 토큰
 * @returns {Record<string, string>} git 환경 변수
 */
export function gitAuthEnv(token) {
  const basic = Buffer.from(`x-access-token:${token}`).toString('base64');
  return {
    GIT_CONFIG_COUNT: '1',
    GIT_CONFIG_KEY_0: 'http.https://github.com/.extraheader',
    GIT_CONFIG_VALUE_0: `AUTHORIZATION: basic ${basic}`,
  };
}

/**
 * GitHub API를 부른다.
 * @param {string} token GitHub App 설치 토큰
 * @param {string} method HTTP 메서드
 * @param {string} route `/repos/...` 아래 경로
 * @param {unknown} [body] 요청 본문
 * @returns {Promise<any>} 응답 JSON
 */
export async function githubApi(token, method, route, body) {
  const response = await fetch(`https://api.github.com/repos/${REPOSITORY}${route}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      'Content-Type': 'application/json',
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (!response.ok) {
    throw new Error(`GitHub API ${method} ${route} 실패 (${String(response.status)})`);
  }
  return response.json();
}

/**
 * 한 커밋의 package.json을 읽는다.
 * @param {typeof runCommand} run 명령 실행
 * @param {string} work worktree
 * @param {string} ref 커밋
 * @param {string} dir 패키지 폴더
 * @returns {{ name: string, version: string }} package.json
 */
function readPackage(run, work, ref, dir) {
  return JSON.parse(run('git', ['show', `${ref}:${dir}/package.json`], { cwd: work }).stdout);
}

/**
 * pnpm을 실행한다. 실행 계정에는 pnpm이 없어, Node에 딸린 npx로 package.json의 packageManager 버전을 받아 쓴다.
 * @param {typeof runCommand} run 명령 실행
 * @param {string} packageManager `pnpm@<버전>`
 * @param {string[]} args pnpm 인자
 * @param {string} cwd 실행 위치
 */
function runPnpm(run, packageManager, args, cwd) {
  run('npx', ['--yes', packageManager, ...args], { cwd, inherit: true });
}

/**
 * 버전이 바뀐 패키지와 CHANGELOG 내용을 모은다.
 * @param {typeof runCommand} run 명령 실행
 * @param {string} work 버전 커밋을 만든 worktree
 * @param {string} base main 커밋
 * @returns {{ name: string, before: string, after: string, notes: string }[]} 바뀐 패키지
 */
export function collectChanges(run, work, base) {
  return versionedPackages.flatMap((dir) => {
    const before = readPackage(run, work, base, dir);
    const after = readPackage(run, work, 'HEAD', dir);
    if (before.version === after.version) {
      return [];
    }
    const changelog = run('git', ['show', `HEAD:${dir}/CHANGELOG.md`], {
      cwd: work,
      allowFailure: true,
    });
    const notes = changelog.status === 0 ? changelogSection(changelog.stdout, after.version) : '';
    return [{ name: after.name, before: before.version, after: after.version, notes }];
  });
}

/**
 * 버전 PR을 만들거나 갱신한다.
 * @codocs [[배포 환경:배포(CD)]]
 * @param {{ run?: typeof runCommand, api?: typeof githubApi, root: string, token: string, log?: (message: string) => void }} options 명령 실행, GitHub API, 저장소 루트, GitHub App 토큰, 로그
 * @returns {Promise<string>} 한 일(`none`, `content-only`, `opened`, `updated`)
 */
export async function runVersionPr({
  run = runCommand,
  api = githubApi,
  root,
  token,
  log = console.log,
}) {
  const pending = pendingChangesets(readdirSync(path.join(root, '.changeset')));
  if (pending.length === 0) {
    log('버전 PR: 쌓인 changeset 없음');
    return 'none';
  }
  // 글 동기화 병합에서는 버전 PR을 건드리지 않는다. 바뀐 것이 없는데 브랜치를 다시 올리면 버전 PR의 CI만 다시 돈다.
  const merged = run('git', ['diff', '--name-only', 'HEAD^1', 'HEAD'], { allowFailure: true });
  if (merged.status === 0 && isContentOnly(merged.stdout.split('\n').filter(Boolean))) {
    log('버전 PR: 글 동기화 병합이라 건너뜀');
    return 'content-only';
  }

  const base = run('git', ['rev-parse', 'HEAD']).stdout;
  const { packageManager } = JSON.parse(readFileSync(path.join(root, 'package.json'), 'utf8'));
  const work = mkdtempSync(path.join(tmpdir(), 'seojaewan-blog-release-'));
  run('git', ['worktree', 'add', '--quiet', '--detach', work, base]);
  try {
    run('git', ['checkout', '--quiet', '-B', RELEASE_BRANCH], { cwd: work });
    // changeset CLI는 루트 개발 의존성이라 루트만 설치한다
    runPnpm(
      run,
      packageManager,
      ['install', '--frozen-lockfile', '--ignore-scripts', '--filter', 'seojaewan-blog'],
      work,
    );
    runPnpm(run, packageManager, ['exec', 'changeset', 'version'], work);
    // 버전이 바뀐 워크스페이스 패키지를 lockfile에 맞춘다
    runPnpm(run, packageManager, ['install', '--lockfile-only', '--ignore-scripts'], work);
    run('git', ['add', '--all'], { cwd: work });
    run(
      'git',
      [
        '-c',
        'core.hooksPath=/dev/null',
        'commit',
        '--quiet',
        '-m',
        'chore(release): version packages',
      ],
      {
        cwd: work,
        env: {
          GIT_AUTHOR_NAME: releaseAuthor.name,
          GIT_AUTHOR_EMAIL: releaseAuthor.email,
          GIT_COMMITTER_NAME: releaseAuthor.name,
          GIT_COMMITTER_EMAIL: releaseAuthor.email,
        },
      },
    );
    const body = versionPrBody(collectChanges(run, work, base));

    // 버전 커밋의 내용이 이미 올린 것과 같으면 올리지 않는다. 같은 내용을 다시 올려도 새 커밋이라 버전 PR의 CI가 다시 돈다.
    const auth = gitAuthEnv(token);
    const remote = `https://github.com/${REPOSITORY}.git`;
    const fetched = run('git', ['fetch', '--quiet', remote, `refs/heads/${RELEASE_BRANCH}`], {
      cwd: work,
      env: auth,
      allowFailure: true,
    });
    const same =
      fetched.status === 0 &&
      run('git', ['rev-parse', 'FETCH_HEAD^{tree}'], { cwd: work }).stdout ===
        run('git', ['rev-parse', 'HEAD^{tree}'], { cwd: work }).stdout;
    if (same) {
      log(`버전 PR: ${RELEASE_BRANCH}가 이미 같은 내용`);
    } else {
      run('git', ['push', '--quiet', '--force', remote, `HEAD:refs/heads/${RELEASE_BRANCH}`], {
        cwd: work,
        env: auth,
      });
      log(`버전 PR: ${RELEASE_BRANCH}에 올림`);
    }

    const owner = REPOSITORY.split('/')[0];
    const open = await api(
      token,
      'GET',
      `/pulls?state=open&head=${owner}:${encodeURIComponent(RELEASE_BRANCH)}`,
    );
    if (open.length === 0) {
      const created = await api(token, 'POST', '/pulls', {
        title: RELEASE_TITLE,
        head: RELEASE_BRANCH,
        base: 'main',
        body,
      });
      log(`버전 PR: #${String(created.number)} 만듦`);
      return 'opened';
    }
    await api(token, 'PATCH', `/pulls/${String(open[0].number)}`, { body });
    log(`버전 PR: #${String(open[0].number)} 갱신`);
    return 'updated';
  } finally {
    run('git', ['worktree', 'remove', '--force', work], { allowFailure: true });
    run('git', ['worktree', 'prune'], { allowFailure: true });
    rmSync(work, { recursive: true, force: true });
  }
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  const token = process.env.GH_TOKEN ?? '';
  if (token === '') {
    throw new Error('GH_TOKEN이 없다. 젠킨스 자격 증명 github-app으로 넘긴다.');
  }
  await runVersionPr({ root: process.cwd(), token });
}
