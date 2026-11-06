import { existsSync, mkdirSync, mkdtempSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { IMAGES_ENV_FILE, runDeploy, writeImagesEnv } from './deploy-changed.mjs';
import { fakeRun } from './fake-run.mjs';

const headSha = 'b'.repeat(40);
const oldSha = 'a'.repeat(40);

let root = '';
let secretsDir = '';

/**
 * 앱 버전과 비밀값 파일을 가진 임시 저장소를 만든다.
 * @param {{ web: string, images: string }} versions 앱 버전
 */
function setUp(versions) {
  for (const [app, version] of Object.entries(versions)) {
    mkdirSync(path.join(root, 'apps', app), { recursive: true });
    writeFileSync(path.join(root, 'apps', app, 'package.json'), JSON.stringify({ version }));
  }
  mkdirSync(path.join(secretsDir, 'project'), { recursive: true });
  mkdirSync(path.join(secretsDir, 'notify'), { recursive: true });
  writeFileSync(path.join(secretsDir, 'project', 'images-notion-token'), 'token-value\n');
  writeFileSync(path.join(secretsDir, 'notify', 'images'), 'alert-value\n');
}

/**
 * 실행 중인 컨테이너의 라벨을 흉내 내는 규칙을 만든다.
 * @param {string} service 서비스
 * @param {{ version: string, revision: string, health?: string } | null} deployed 배포한 버전과 커밋, health 상태. null이면 컨테이너 없음
 * @returns {[string, { stdout: string }][]} 규칙
 */
function container(service, deployed) {
  if (deployed === null) {
    return [[`docker compose ps --quiet --status running ${service}`, { stdout: '' }]];
  }
  return [
    [`docker compose ps --quiet --status running ${service}`, { stdout: `id-${service}` }],
    [
      `docker inspect id-${service}`,
      {
        stdout: JSON.stringify([
          {
            Image: `sha256:running-${service}`,
            State: { Health: { Status: deployed.health ?? 'healthy' } },
            Config: {
              Labels: {
                'org.opencontainers.image.version': deployed.version,
                'org.opencontainers.image.revision': deployed.revision,
              },
            },
          },
        ]),
      },
    ],
  ];
}

/**
 * 공통 규칙(지금 커밋, main 확인)을 더해 배포를 돌린다.
 * @param {[string, unknown][]} rules 더할 규칙
 * @returns {{ result: { deployed: string[], failed: string[] }, calls: string[] }} 결과와 부른 명령
 */
function deploy(rules) {
  const { run, calls } = fakeRun([['git rev-parse HEAD', { stdout: headSha }], ...rules]);
  const result = runDeploy({ run, root, secretsDir, dataDir: '/data/images', log: () => {} });
  return { result, calls };
}

beforeEach(() => {
  root = mkdtempSync(path.join(tmpdir(), 'deploy-root-'));
  secretsDir = mkdtempSync(path.join(tmpdir(), 'deploy-secrets-'));
});

afterEach(() => {
  rmSync(root, { recursive: true, force: true });
  rmSync(secretsDir, { recursive: true, force: true });
});

// @codocs [[배포 환경:배포(CD)]]
describe('runDeploy', () => {
  it('처음 배포(실행 중인 컨테이너 없음)는 두 앱을 모두 빌드하고 바꾼다', () => {
    setUp({ web: '0.0.0', images: '0.0.0' });
    const { result, calls } = deploy([...container('web', null), ...container('images', null)]);
    expect(result).toEqual({ deployed: ['web', 'images'], failed: [] });
    // 되돌릴 실행 중인 이미지가 없다
    expect(calls.some((line) => line.startsWith('docker image tag'))).toBe(false);
    expect(calls).toContain(
      `docker compose build --build-arg APP_VERSION=0.0.0 --build-arg REVISION=${headSha} web`,
    );
    expect(calls).toContain(
      'docker compose up --detach --wait --wait-timeout 300 --no-build --no-deps images',
    );
    // 빌드를 모두 마친 뒤에 바꾼다
    const lastBuild = calls.findLastIndex((line) => line.startsWith('docker compose build'));
    const firstUp = calls.findIndex((line) => line.startsWith('docker compose up'));
    expect(lastBuild).toBeLessThan(firstUp);
  });

  it('버전과 글이 그대로면 아무것도 하지 않는다', () => {
    setUp({ web: '0.1.0', images: '0.1.0' });
    const { result, calls } = deploy([
      ...container('web', { version: '0.1.0', revision: oldSha }),
      ...container('images', { version: '0.1.0', revision: oldSha }),
      ['git diff --quiet', { status: 0 }],
    ]);
    expect(result).toEqual({ deployed: [], failed: [] });
    expect(calls.some((line) => line.startsWith('docker compose build'))).toBe(false);
  });

  it('글 JSON만 바뀌었으면 블로그만 다시 빌드한다', () => {
    setUp({ web: '0.1.0', images: '0.1.0' });
    const { result, calls } = deploy([
      ...container('web', { version: '0.1.0', revision: oldSha }),
      ...container('images', { version: '0.1.0', revision: oldSha }),
      [`git diff --quiet ${oldSha} ${headSha} -- apps/web/content/`, { status: 1 }],
    ]);
    expect(result.deployed).toEqual(['web']);
    expect(
      calls.some((line) => line.startsWith('docker compose build') && line.endsWith('images')),
    ).toBe(false);
  });

  it('버전이 바뀐 앱만 배포하고, 이미지 서버에는 비밀값 파일을 넣었다가 지운다', () => {
    setUp({ web: '0.1.0', images: '0.2.0' });
    let envFileDuringUp = '';
    const { result, calls } = deploy([
      ...container('web', { version: '0.1.0', revision: oldSha }),
      ...container('images', { version: '0.1.0', revision: oldSha }),
      ['git diff --quiet', { status: 0 }],
      [
        'docker compose up',
        () => {
          envFileDuringUp = existsSync(path.join(root, IMAGES_ENV_FILE)) ? 'present' : 'missing';
          return {};
        },
      ],
    ]);
    expect(result.deployed).toEqual(['images']);
    expect(envFileDuringUp).toBe('present');
    expect(existsSync(path.join(root, IMAGES_ENV_FILE))).toBe(false);
    expect(calls).toContain(
      'docker run --rm --user 0:0 --entrypoint chown --volume /data/images:/data seojaewan-blog/images:latest 10001:10001 /data',
    );
    // 비밀값은 명령 인자에 들어가지 않는다
    expect(calls.join('\n')).not.toMatch(/token-value|alert-value/u);
  });

  it('health check를 통과하지 못하면 이전 이미지로 되돌리고 실패로 알린다', () => {
    setUp({ web: '0.2.0', images: '0.1.0' });
    const { result, calls } = deploy([
      ...container('web', { version: '0.1.0', revision: oldSha }),
      ...container('images', { version: '0.1.0', revision: oldSha }),
      ['git diff --quiet', { status: 0 }],
      [
        'docker compose up --detach --wait --wait-timeout 300 --no-build --no-deps web',
        { status: 1 },
      ],
    ]);
    expect(result).toEqual({ deployed: [], failed: ['web'] });
    expect(calls).toContain('docker image tag sha256:running-web seojaewan-blog/web:previous');
    expect(calls).toContain(
      'docker image tag seojaewan-blog/web:previous seojaewan-blog/web:latest',
    );
    expect(calls).toContain(
      'docker compose up --detach --wait --wait-timeout 300 --no-build --no-deps --force-recreate web',
    );
  });

  it('컨테이너를 만든 커밋을 모르면 글이 바뀐 것으로 보고 다시 배포한다', () => {
    setUp({ web: '0.1.0', images: '0.1.0' });
    const { result } = deploy([
      ...container('web', { version: '0.1.0', revision: 'unknown' }),
      ...container('images', { version: '0.1.0', revision: oldSha }),
    ]);
    expect(result.deployed).toEqual(['web']);
  });

  it('health check에 실패한 채 도는 컨테이너는 버전이 같아도 다시 배포한다', () => {
    setUp({ web: '0.1.0', images: '0.1.0' });
    const { result, calls } = deploy([
      ...container('web', { version: '0.1.0', revision: oldSha }),
      ...container('images', { version: '0.1.0', revision: oldSha, health: 'unhealthy' }),
      ['git diff --quiet', { status: 0 }],
    ]);
    expect(result.deployed).toEqual(['images']);
    // 망가진 이미지를 되돌릴 대상으로 삼지 않는다
    expect(calls.some((line) => line.startsWith('docker image tag'))).toBe(false);
  });

  it('HEAD가 main에 없으면 아무것도 하지 않고 멈춘다', () => {
    setUp({ web: '0.1.0', images: '0.1.0' });
    expect(() => deploy([['git merge-base --is-ancestor', { status: 1 }]])).toThrow(
      /origin\/main/u,
    );
  });
});

// @codocs [[배포 환경:배포(CD)]]
describe('writeImagesEnv', () => {
  it('비밀값을 권한 600 파일로 쓴다', () => {
    setUp({ web: '0.1.0', images: '0.1.0' });
    writeImagesEnv(root, secretsDir);
    const file = path.join(root, IMAGES_ENV_FILE);
    expect(statSync(file).mode & 0o777).toBe(0o600);
  });

  it('비밀값 파일이 없으면 멈춘다', () => {
    setUp({ web: '0.1.0', images: '0.1.0' });
    rmSync(path.join(secretsDir, 'notify', 'images'));
    expect(() => {
      writeImagesEnv(root, secretsDir);
    }).toThrow(/notify\/images/u);
  });
});
