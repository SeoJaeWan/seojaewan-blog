import { chmodSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

import { CONTENT_DIR, deployApps, planDeploy } from './release-plan.mjs';
import { runCommand } from './run-command.mjs';

// @codocs [[배포 환경:배포(CD)]]
// 젠킨스가 main을 체크아웃한 자리에서 돈다. 앱마다 실행 중인 컨테이너의 라벨(배포한 버전과 커밋)과 지금 main을 비교해
// 바뀐 앱만 빌드하고 `docker compose up -d --wait`로 바꾼다. health check를 통과하지 못하면 이전 이미지로 되돌리고 실패로 끝낸다.
// 공통 규칙은 local-server 저장소의 .codocs/foundation/project-deploy.yaml(프로젝트 배포)이다.

/** 이미지 라벨: 이미지 이름(`seojaewan-blog-<서비스>`). 이전 빌드를 지울 때 이 프로젝트 것만 고른다 */
export const TITLE_LABEL = 'org.opencontainers.image.title';
/** 이미지 라벨: 배포한 버전 */
export const VERSION_LABEL = 'org.opencontainers.image.version';
/** 이미지 라벨: 이미지를 만든 커밋 */
export const REVISION_LABEL = 'org.opencontainers.image.revision';
/** 이미지 서버 컨테이너의 실행 uid·gid(apps/images/Dockerfile) */
export const IMAGES_UID = '10001:10001';
/** 이미지 서버 저장 폴더(호스트) */
export const DEFAULT_DATA_DIR = '/srv/seojaewan-blog/images';
/** compose.yaml의 env_file. 배포하는 동안만 있다 */
export const IMAGES_ENV_FILE = '.deploy-secrets/images.env';
/**
 * 이미지 서버의 비밀값. 실행 계정의 `/run/secrets` 아래 파일에서 읽어 환경 변수로 넣는다.
 * `project/`는 프로젝트 비밀값, `notify/`는 notify 클라이언트 비밀값이다.
 */
export const imagesSecrets = [
  { name: 'NOTION_TOKEN', file: 'project/images-notion-token' },
  { name: 'ALERT_SECRET', file: 'notify/images' },
];
/** health check를 기다리는 최대 시간(초) */
const WAIT_TIMEOUT_SECONDS = '300';

/**
 * compose 서비스의 이미지 이름. compose.yaml의 `image`와 같다.
 * @param {string} service 서비스 이름
 * @param {string} [tag] 태그
 * @returns {string} 이미지 이름
 */
export function imageName(service, tag = 'latest') {
  return `seojaewan-blog/${service}:${tag}`;
}

/**
 * 실행 중인 컨테이너에서 배포한 버전과 커밋, 그 이미지를 읽는다. 실행 중인 컨테이너가 없거나 unhealthy면 null이다.
 * @param {typeof runCommand} run 명령 실행
 * @param {string} service 서비스 이름
 * @returns {{ version: string, revision: string, image: string } | null} 배포한 버전과 커밋, 이미지 ID
 */
export function readDeployed(run, service) {
  const id = run('docker', ['compose', 'ps', '--quiet', '--status', 'running', service]).stdout;
  if (id === '') {
    return null;
  }
  const [container] = JSON.parse(run('docker', ['inspect', id.split('\n')[0]]).stdout);
  // health check에 실패한 컨테이너는 배포되지 않은 것으로 보고 다시 배포한다
  if (container?.State?.Health?.Status === 'unhealthy') {
    return null;
  }
  const labels = container?.Config?.Labels ?? {};
  return {
    version: labels[VERSION_LABEL] ?? '',
    revision: labels[REVISION_LABEL] ?? '',
    image: container?.Image ?? '',
  };
}

/**
 * 컨테이너를 만든 커밋과 지금 커밋 사이에 글 JSON이 바뀌었는지 본다. 그 커밋을 모르면 바뀐 것으로 본다.
 * @param {typeof runCommand} run 명령 실행
 * @param {string} revision 컨테이너를 만든 커밋
 * @param {string} head 지금 커밋
 * @returns {boolean} 바뀌었으면 true
 */
export function contentChangedSince(run, revision, head) {
  if (!/^[0-9a-f]{40}$/u.test(revision)) {
    return true;
  }
  if (run('git', ['cat-file', '-e', `${revision}^{commit}`], { allowFailure: true }).status !== 0) {
    return true;
  }
  const diff = run('git', ['diff', '--quiet', revision, head, '--', CONTENT_DIR], {
    allowFailure: true,
  });
  return diff.status !== 0;
}

/**
 * 이미지 서버의 비밀값을 compose env_file로 쓴다(권한 600). 값은 로그에 남기지 않는다.
 * @param {string} root 저장소 루트
 * @param {string} secretsDir 비밀값 폴더(`/run/secrets`)
 */
export function writeImagesEnv(root, secretsDir) {
  const lines = imagesSecrets.map(({ name, file }) => {
    const source = path.join(secretsDir, file);
    if (!existsSync(source)) {
      throw new Error(`비밀값 파일이 없다: ${source}. owner가 local-server에서 넣는다.`);
    }
    const value = readFileSync(source, 'utf8').trim();
    if (value === '' || /[\r\n]/u.test(value)) {
      throw new Error(`비밀값 파일이 비었거나 여러 줄이다: ${source}`);
    }
    return `${name}=${value}`;
  });
  const target = path.join(root, IMAGES_ENV_FILE);
  mkdirSync(path.dirname(target), { recursive: true, mode: 0o700 });
  writeFileSync(target, `${lines.join('\n')}\n`, { mode: 0o600 });
  chmodSync(target, 0o600);
}

/**
 * 비밀값 파일을 지운다.
 * @param {string} root 저장소 루트
 */
export function removeImagesEnv(root) {
  rmSync(path.join(root, path.dirname(IMAGES_ENV_FILE)), { recursive: true, force: true });
}

/**
 * 서비스 하나를 바꾼다. health check를 통과하지 못하면 이전 이미지로 되돌리고 false를 돌려준다.
 * @param {typeof runCommand} run 명령 실행
 * @param {string} service 서비스 이름
 * @param {boolean} hasPrevious 되돌릴 이전 이미지가 있는지
 * @param {(message: string) => void} log 로그
 * @returns {boolean} 바꿨으면 true
 */
export function replaceService(run, service, hasPrevious, log) {
  const up = ['compose', 'up', '--detach', '--wait', '--wait-timeout', WAIT_TIMEOUT_SECONDS];
  const result = run('docker', [...up, '--no-build', '--no-deps', service], {
    allowFailure: true,
    inherit: true,
  });
  if (result.status === 0) {
    log(`${service}: health check 통과`);
    return true;
  }
  log(`${service}: health check 실패`);
  if (hasPrevious) {
    run('docker', ['image', 'tag', imageName(service, 'previous'), imageName(service)]);
    const rollback = run(
      'docker',
      [...up, '--no-build', '--no-deps', '--force-recreate', service],
      { allowFailure: true, inherit: true },
    );
    log(`${service}: 이전 이미지로 되돌림 ${rollback.status === 0 ? '성공' : '실패'}`);
  }
  return false;
}

/**
 * 바뀐 앱만 배포한다.
 * @codocs [[배포 환경:배포(CD)]]
 * @param {{ run?: typeof runCommand, root: string, secretsDir: string, dataDir: string, log?: (message: string) => void }} options 명령 실행, 저장소 루트, 비밀값 폴더, 이미지 저장 폴더, 로그
 * @returns {{ deployed: string[], failed: string[] }} 배포한 서비스와 실패한 서비스
 */
export function runDeploy({ run = runCommand, root, secretsDir, dataDir, log = console.log }) {
  const head = run('git', ['rev-parse', 'HEAD']).stdout;
  // 판단은 main의 커밋으로만 한다. 버전 PR 브랜치나 다른 커밋이 체크아웃돼 있으면 멈춘다.
  if (
    run('git', ['merge-base', '--is-ancestor', head, 'origin/main'], { allowFailure: true })
      .status !== 0
  ) {
    throw new Error(`HEAD ${head}가 origin/main에 없다`);
  }

  const states = deployApps.map(({ service, dir, followsContent }) => {
    const { version } = JSON.parse(readFileSync(path.join(root, dir, 'package.json'), 'utf8'));
    const deployed = readDeployed(run, service);
    const contentChanged =
      followsContent && deployed !== null && contentChangedSince(run, deployed.revision, head);
    return { service, version, deployed, contentChanged };
  });
  const plan = planDeploy(states);
  for (const { service, deploy, reason } of plan) {
    log(`${service}: ${deploy ? '배포' : '그대로'} (${reason})`);
  }
  const targets = plan.filter(({ deploy }) => deploy);
  if (targets.length === 0) {
    return { deployed: [], failed: [] };
  }

  // 모두 빌드한 뒤에 바꾼다. 빌드가 깨지면 실행 중인 컨테이너는 그대로다.
  // 되돌릴 이미지는 `latest`가 아니라 지금 실행 중인 컨테이너의 이미지다. 앞선 실행에서 빌드만 되고 배포되지 않은 이미지로 되돌리지 않기 위해서다.
  const hasPrevious = new Map();
  for (const { service, version } of targets) {
    const running = states.find((state) => state.service === service)?.deployed?.image ?? '';
    hasPrevious.set(service, running !== '');
    if (running !== '') {
      run('docker', ['image', 'tag', running, imageName(service, 'previous')]);
    }
    run(
      'docker',
      [
        'compose',
        'build',
        '--build-arg',
        `APP_VERSION=${version}`,
        '--build-arg',
        `REVISION=${head}`,
        service,
      ],
      { inherit: true },
    );
  }

  const deployed = [];
  const failed = [];
  try {
    for (const { service } of targets) {
      if (service === 'images') {
        writeImagesEnv(root, secretsDir);
        // 저장 폴더를 실행 계정(uid 10001)이 쓸 수 있게 한다. 폴더가 없으면 Docker가 만든다.
        run('docker', [
          'run',
          '--rm',
          '--user',
          '0:0',
          '--entrypoint',
          'chown',
          '--volume',
          `${dataDir}:/data`,
          imageName('images'),
          IMAGES_UID,
          '/data',
        ]);
      }
      if (replaceService(run, service, hasPrevious.get(service) === true, log)) {
        deployed.push(service);
      } else {
        failed.push(service);
      }
    }
  } finally {
    removeImagesEnv(root);
  }
  // 이름을 잃은 이전 빌드 이미지를 지운다. `previous` 태그 하나는 손으로 되돌릴 때를 위해 남긴다.
  for (const { service } of targets) {
    run(
      'docker',
      ['image', 'prune', '--force', '--filter', `label=${TITLE_LABEL}=seojaewan-blog-${service}`],
      { allowFailure: true },
    );
  }
  return { deployed, failed };
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  const { failed } = runDeploy({
    root: process.cwd(),
    secretsDir: process.env.SECRETS_DIR ?? '/run/secrets',
    dataDir: process.env.IMAGE_DATA_DIR ?? DEFAULT_DATA_DIR,
  });
  if (failed.length > 0) {
    console.error(`배포 실패: ${failed.join(', ')}`);
    process.exitCode = 1;
  }
}
