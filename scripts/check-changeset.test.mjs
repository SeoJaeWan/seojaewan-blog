import { describe, expect, it } from 'vitest';

import { changesetStatusArgs, isExemptBranch } from './check-changeset.mjs';

// @codocs [[Git 작업 규칙:Changesets]]
describe('isExemptBranch', () => {
  it.each(['chore/notion-content-sync', 'renovate/react', 'chore/release'])(
    '%s는 뺀다',
    (branch) => {
      expect(isExemptBranch(branch)).toBe(true);
    },
  );

  it.each([
    'feat/taskbar-pin',
    'chore/changesets',
    'chore/release-notes',
    'changeset-release/main',
    'docs/ci-notes',
    'main',
  ])('%s는 검사한다', (branch) => {
    expect(isExemptBranch(branch)).toBe(false);
  });
});

// @codocs [[Git 작업 규칙:Changesets]]
describe('changesetStatusArgs', () => {
  it('어떤 파일이 changeset을 요구하는지는 changeset status에 맡긴다', () => {
    expect(changesetStatusArgs('origin/main')).toEqual([
      'exec',
      'changeset',
      'status',
      '--since=origin/main',
    ]);
  });
});
