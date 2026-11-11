import { describe, expect, it } from 'vitest';

import {
  disallowedDocsFiles,
  docsBranchMessage,
  isAllowedDocsFile,
  isDocsBranch,
} from './check-docs-branch.mjs';

// @codocs [[Git 작업 규칙:브랜치]]
describe('isDocsBranch', () => {
  it.each(['docs/ci-notes', 'docs/figma-flow-discussion'])('%s는 문서 브랜치다', (branch) => {
    expect(isDocsBranch(branch)).toBe(true);
  });

  it.each(['feat/docs-page', 'chore/release', 'documents/x', 'main'])(
    '%s는 문서 브랜치가 아니다',
    (branch) => {
      expect(isDocsBranch(branch)).toBe(false);
    },
  );
});

// @codocs [[Git 작업 규칙:브랜치]]
describe('isAllowedDocsFile', () => {
  it.each([
    '.codocs/foundation/deployment.yaml',
    '.codocs/discussions/2026-11-09/a.yaml',
    '.claude/skills/figma-component-pr/SKILL.md',
    '.claude/settings.json',
    'AGENTS.md',
    'CLAUDE.md',
    'README.md',
    'apps/web/AGENTS.md',
    'packages/design-system/README.md',
  ])('%s는 허용한다', (file) => {
    expect(isAllowedDocsFile(file)).toBe(true);
  });

  it.each([
    'apps/web/src/app/page.tsx',
    'scripts/check-branch-name.mjs',
    '.github/workflows/ci.yml',
    'package.json',
    '.changeset/a.md',
    'docs/guide.md',
    'apps/web/NOTES.md',
    'MY-README.md',
    'apps/web/.codocs/a.yaml',
  ])('%s는 허용하지 않는다', (file) => {
    expect(isAllowedDocsFile(file)).toBe(false);
  });
});

// @codocs [[Git 작업 규칙:브랜치]]
describe('disallowedDocsFiles', () => {
  it('허용 범위 밖의 파일만 고른다', () => {
    expect(
      disallowedDocsFiles(['.codocs/a.yaml', 'AGENTS.md', 'scripts/a.mjs', 'apps/web/README.md']),
    ).toEqual(['scripts/a.mjs']);
  });

  it('문서만 바꿨거나 바뀐 파일이 없으면 비어 있다', () => {
    expect(disallowedDocsFiles(['.codocs/a.yaml', '.claude/b.md'])).toEqual([]);
    expect(disallowedDocsFiles([])).toEqual([]);
  });

  it('실패 메시지에 파일과 다른 종류의 브랜치로 올리라는 안내를 담는다', () => {
    const message = docsBranchMessage('docs/x', ['scripts/a.mjs']);

    expect(message).toContain('docs/x');
    expect(message).toContain('  - scripts/a.mjs');
    expect(message).toContain('다른 종류의 브랜치');
  });
});
