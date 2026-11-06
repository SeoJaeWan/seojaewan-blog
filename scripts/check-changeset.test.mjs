import { describe, expect, it } from 'vitest';

import { isExemptBranch, needsChangeset } from './check-changeset.mjs';

// @codocs [[Git 작업 규칙:Changesets]]
describe('isExemptBranch', () => {
  it.each(['chore/notion-content-sync', 'renovate/react', 'changeset-release/main'])(
    '%s는 뺀다',
    (branch) => {
      expect(isExemptBranch(branch)).toBe(true);
    },
  );

  it.each(['feat/taskbar-pin', 'chore/changesets', 'main'])('%s는 검사한다', (branch) => {
    expect(isExemptBranch(branch)).toBe(false);
  });
});

describe('needsChangeset', () => {
  it.each([
    ['앱 코드', ['apps/web/src/app/page.tsx']],
    ['이미지 서버', ['apps/images/src/server.ts']],
    ['패키지', ['packages/design-system/src/Button.tsx']],
    ['문서와 코드가 함께', ['.codocs/foundation/deployment.yaml', 'apps/web/src/a.ts']],
  ])('%s는 필요하다', (_name, files) => {
    expect(needsChangeset(files)).toBe(true);
  });

  it.each([
    ['문서', ['.codocs/foundation/deployment.yaml', 'AGENTS.md']],
    ['앱 안의 마크다운', ['apps/web/README.md']],
    ['글 JSON', ['apps/web/content/posts/a.json']],
    ['도구', ['tools/figma-plugin/src/a.ts']],
    ['루트 설정', ['package.json', '.github/workflows/ci.yml']],
    ['바뀐 파일 없음', []],
  ])('%s는 필요 없다', (_name, files) => {
    expect(needsChangeset(files)).toBe(false);
  });
});
