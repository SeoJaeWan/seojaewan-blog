// @codocs [[배포 환경:배포(CD)]]
// 젠킨스 작업(`seojaewan-blog-release`)이 무엇을 할지 정하는 판단만 모았다. 명령을 부르지 않아 단위 시험으로 확인한다.
// 명령을 부르는 쪽은 deploy-changed.mjs(배포)와 version-pr.mjs(버전 PR)다.

/** compose 프로젝트 이름. compose.yaml의 `name`과 같다 */
export const PROJECT = 'seojaewan-blog';

/** 글 JSON 폴더. 이 아래만 바뀐 병합은 글 동기화다 */
export const CONTENT_DIR = 'apps/web/content/';

/**
 * 배포하는 앱. `service`는 compose 서비스 이름, `dir`은 버전을 읽을 package.json의 폴더다.
 * `followsContent`인 앱은 글 JSON이 배포한 커밋과 달라지면 버전이 같아도 다시 배포한다.
 */
export const deployApps = [
  { service: 'web', dir: 'apps/web', followsContent: true },
  { service: 'images', dir: 'apps/images', followsContent: false },
];

/**
 * 바뀐 파일이 모두 글 JSON인지(글 동기화 병합인지) 알려 준다. 바뀐 파일이 없으면 글 병합이 아니다.
 * @codocs [[배포 환경:배포(CD)]]
 * @param {string[]} files 바뀐 파일 경로(저장소 루트 기준)
 * @returns {boolean} 모두 글 JSON이면 true
 */
export function isContentOnly(files) {
  return files.length > 0 && files.every((file) => file.startsWith(CONTENT_DIR));
}

/**
 * 쌓인 changeset 파일을 고른다. `.changeset/README.md`는 changeset이 아니다.
 * @codocs [[Git 작업 규칙:Changesets]]
 * @param {string[]} names `.changeset` 폴더의 파일 이름
 * @returns {string[]} changeset 파일 이름
 */
export function pendingChangesets(names) {
  return names.filter((name) => name.endsWith('.md') && name !== 'README.md');
}

/**
 * 앱마다 배포할지와 그 까닭을 정한다.
 * - 실행 중인 컨테이너가 없으면(처음 배포, 멈춤) 배포한다.
 * - package.json 버전이 실행 중인 컨테이너의 버전 라벨과 다르면 배포한다(버전 PR 병합).
 * - 글을 따르는 앱(블로그)은 글 JSON이 컨테이너를 만든 커밋과 다르면 배포한다(글 동기화 병합).
 * @codocs [[배포 환경:배포(CD)]]
 * @param {{ service: string, version: string, deployed: { version: string, revision: string } | null, contentChanged: boolean }[]} apps 앱의 지금 상태
 * @returns {{ service: string, version: string, deploy: boolean, reason: string }[]} 앱마다의 판단
 */
export function planDeploy(apps) {
  return apps.map(({ service, version, deployed, contentChanged }) => {
    if (deployed === null) {
      return { service, version, deploy: true, reason: `실행 중인 컨테이너 없음 → ${version}` };
    }
    if (deployed.version !== version) {
      return { service, version, deploy: true, reason: `${deployed.version} → ${version}` };
    }
    if (contentChanged) {
      return { service, version, deploy: true, reason: `글 JSON 바뀜 (${version} 그대로)` };
    }
    return { service, version, deploy: false, reason: `${version} 배포됨` };
  });
}

/**
 * CHANGELOG.md에서 한 버전의 내용을 꺼낸다.
 * @param {string} changelog CHANGELOG.md 내용
 * @param {string} version 버전
 * @returns {string} 그 버전 제목 아래 내용. 없으면 빈 글
 */
export function changelogSection(changelog, version) {
  const section = changelog.split(/^## /mu).find((part) => part.startsWith(`${version}\n`));
  return section === undefined ? '' : section.split('\n').slice(1).join('\n').trim();
}

/**
 * 버전 PR 본문을 만든다.
 * @codocs [[배포 환경:배포(CD)]]
 * @param {{ name: string, before: string, after: string, notes: string }[]} changes 버전이 바뀐 패키지
 * @returns {string} PR 본문
 */
export function versionPrBody(changes) {
  const lines = [
    'main에 쌓인 changeset으로 버전을 올린다. 머지하면 젠킨스 `seojaewan-blog-release`가 버전이 바뀐 앱만 배포한다.',
    '',
  ];
  for (const { name, before, after, notes } of changes) {
    lines.push(`## ${name} ${before} → ${after}`, '');
    if (notes !== '') {
      lines.push(notes, '');
    }
  }
  lines.push('젠킨스 `seojaewan-blog-release`가 만든 PR이다.');
  return lines.join('\n');
}
