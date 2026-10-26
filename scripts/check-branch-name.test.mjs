import { describe, expect, it } from 'vitest';

import { isValidBranchName } from './check-branch-name.mjs';

// @codocs [[Git 작업 규칙:브랜치]]
describe('isValidBranchName', () => {
  it.each([
    'feat/taskbar-pin',
    'feat/figma-tokens',
    'feat/figma-button',
    'feat/figma-patterns-window',
    'feat/figma-motion-progress-ring',
    'fix/a-b',
    'fix/window-drag',
    'chore/setup-monorepo',
    'ci/branch-name-check',
    'docs/a1',
    'revert/x',
    'main',
    'renovate/react',
    'renovate/major-storybook-monorepo',
    'renovate/actions-checkout-7.x',
  ])('허용한다: %s', (name) => {
    expect(isValidBranchName(name)).toBe(true);
  });

  it.each([
    'claude/gifted-franklin-mdqygs',
    'feature/x',
    'feat/',
    'feat',
    '/x',
    'Feat/X',
    'feat/X',
    'feat/한글',
    'feat/a_b',
    'feat/-a',
    'feat/a-',
    'feat/a--b',
    'feat/a/b',
    'feat/a b',
    'feat/a\nb',
    'main2',
    'renovate/',
    'master',
    '',
  ])('거절한다: %j', (name) => {
    expect(isValidBranchName(name)).toBe(false);
  });
});
