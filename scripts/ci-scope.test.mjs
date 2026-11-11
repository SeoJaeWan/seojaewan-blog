import { describe, expect, it } from 'vitest';

import { isSkippedBranch, mergedBranchOf, shouldRunCi } from './ci-scope.mjs';

// @codocs [[Git 작업 규칙:CI]]
describe('isSkippedBranch', () => {
  it.each(['chore/release', 'docs/figma-flow-discussion', 'chore/notion-content-sync'])(
    '%s는 건너뛴다',
    (branch) => {
      expect(isSkippedBranch(branch)).toBe(true);
    },
  );

  it.each([
    'feat/taskbar-pin',
    'renovate/react',
    'chore/release-notes',
    'chore/notion-content-sync-fix',
    'fix/docs',
    'docs',
  ])('%s는 돈다', (branch) => {
    expect(isSkippedBranch(branch)).toBe(false);
  });
});

// @codocs [[Git 작업 규칙:CI]]
describe('mergedBranchOf', () => {
  it('병합 커밋 제목에서 소유자 뒤의 브랜치를 읽는다', () => {
    expect(
      mergedBranchOf(
        'Merge pull request #934 from SeoJaeWan/docs/figma-flow-discussion\n\ndocs(codocs): add notes',
      ),
    ).toBe('docs/figma-flow-discussion');
    expect(mergedBranchOf('Merge pull request #902 from SeoJaeWan/chore/release')).toBe(
      'chore/release',
    );
  });

  it.each([
    'feat(web): add page',
    "Merge branch 'main' into feat/x",
    'chore: Merge pull request #1 from a/b',
    '',
  ])('병합 커밋 제목이 아니면 null이다: %s', (message) => {
    expect(mergedBranchOf(message)).toBeNull();
  });
});

// @codocs [[Git 작업 규칙:CI]]
describe('shouldRunCi', () => {
  it.each([
    ['feat/taskbar-pin', true],
    ['renovate/react', true],
    ['chore/release', false],
    ['docs/ci-notes', false],
    ['chore/notion-content-sync', false],
  ])('PR %s → %s', (headRef, expected) => {
    expect(shouldRunCi({ eventName: 'pull_request', headRef })).toBe(expected);
  });

  it.each([
    ['Merge pull request #1 from SeoJaeWan/feat/taskbar-pin', true],
    ['Merge pull request #2 from SeoJaeWan/renovate/react', true],
    ['Merge pull request #3 from SeoJaeWan/chore/release', false],
    ['Merge pull request #4 from SeoJaeWan/docs/ci-notes', false],
    ['Merge pull request #5 from SeoJaeWan/chore/notion-content-sync', false],
  ])('main push "%s" → %s', (headCommitMessage, expected) => {
    expect(shouldRunCi({ eventName: 'push', headCommitMessage })).toBe(expected);
  });

  it('브랜치를 읽지 못한 push(직접 push, 메시지 없음)는 돈다', () => {
    expect(shouldRunCi({ eventName: 'push', headCommitMessage: 'fix(web): hotfix' })).toBe(true);
    expect(shouldRunCi({ eventName: 'push' })).toBe(true);
  });
});
