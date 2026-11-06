import { describe, expect, it } from 'vitest';

import {
  changelogSection,
  isContentOnly,
  pendingChangesets,
  planDeploy,
  versionPrBody,
} from './release-plan.mjs';

// @codocs [[배포 환경:배포(CD)]]
describe('isContentOnly', () => {
  it('바뀐 파일이 모두 글 JSON이면 글 동기화 병합이다', () => {
    expect(isContentOnly(['apps/web/content/notion.json'])).toBe(true);
  });

  it.each([
    ['코드가 섞임', ['apps/web/content/notion.json', 'apps/web/src/env.ts']],
    ['changeset', ['.changeset/brave-cats.md']],
    ['바뀐 파일 없음', []],
    ['비슷한 이름의 폴더', ['apps/web/contents/a.json']],
  ])('%s는 글 동기화 병합이 아니다', (_name, files) => {
    expect(isContentOnly(files)).toBe(false);
  });
});

// @codocs [[Git 작업 규칙:Changesets]]
describe('pendingChangesets', () => {
  it('README.md와 설정 파일은 changeset이 아니다', () => {
    expect(pendingChangesets(['README.md', 'config.json', 'brave-cats.md'])).toEqual([
      'brave-cats.md',
    ]);
  });
});

// @codocs [[배포 환경:배포(CD)]]
describe('planDeploy', () => {
  const deployed = { version: '0.1.0', revision: 'a'.repeat(40) };

  it('실행 중인 컨테이너가 없으면(처음 배포) 배포한다', () => {
    const [web, images] = planDeploy([
      { service: 'web', version: '0.0.0', deployed: null, contentChanged: false },
      { service: 'images', version: '0.0.0', deployed: null, contentChanged: false },
    ]);
    expect(web?.deploy).toBe(true);
    expect(images?.deploy).toBe(true);
  });

  it('버전이 다른 앱만 배포한다', () => {
    const plan = planDeploy([
      { service: 'web', version: '0.1.0', deployed, contentChanged: false },
      { service: 'images', version: '0.2.0', deployed, contentChanged: false },
    ]);
    expect(plan.map(({ service, deploy }) => [service, deploy])).toEqual([
      ['web', false],
      ['images', true],
    ]);
  });

  it('버전이 같아도 글 JSON이 바뀌었으면 배포한다', () => {
    const [web] = planDeploy([
      { service: 'web', version: '0.1.0', deployed, contentChanged: true },
    ]);
    expect(web).toMatchObject({ deploy: true, reason: '글 JSON 바뀜 (0.1.0 그대로)' });
  });
});

describe('changelogSection', () => {
  const changelog = [
    '# @seojaewan/web',
    '',
    '## 0.2.0',
    '',
    '### Minor Changes',
    '',
    '- abc123: 새 기능',
    '',
    '## 0.1.0',
    '',
    '- 처음',
    '',
  ].join('\n');

  it('한 버전의 내용만 꺼낸다', () => {
    expect(changelogSection(changelog, '0.2.0')).toBe('### Minor Changes\n\n- abc123: 새 기능');
  });

  it('없는 버전은 빈 글이다', () => {
    expect(changelogSection(changelog, '0.2')).toBe('');
  });
});

// @codocs [[배포 환경:배포(CD)]]
describe('versionPrBody', () => {
  it('버전이 바뀐 패키지와 변경 내용을 적는다', () => {
    const body = versionPrBody([
      { name: '@seojaewan/web', before: '0.0.0', after: '0.1.0', notes: '- 첫 배포' },
    ]);
    expect(body).toContain('## @seojaewan/web 0.0.0 → 0.1.0\n\n- 첫 배포');
    expect(body).not.toMatch(/Generated with/u);
  });
});
