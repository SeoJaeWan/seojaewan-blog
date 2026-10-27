import { describe, expect, it } from 'vitest';

import { createInitialWorkspace } from '@/shared/utils/workspace-rules/workspace-rules';

import { getChromeTabTitle, getChromeWindowTitle } from './chrome-tab-title';

const workspace = createInitialWorkspace({
  posts: [{ slug: 'a', title: '가', folderPath: [], date: '2026-10-20' }],
  links: [],
});

// @codocs [[Chrome:새 탭 페이지]]
describe('Chrome:새 탭 페이지', () => {
  it('탭 제목은 새 탭 페이지면 "새 탭", 글이면 글 제목이고, 색인에 없는 글은 slug다', () => {
    expect(getChromeTabTitle(workspace, { kind: 'new-tab' })).toBe('새 탭');
    expect(getChromeTabTitle(workspace, { kind: 'post', slug: 'a' })).toBe('가');
    expect(getChromeTabTitle(workspace, { kind: 'post', slug: 'gone' })).toBe('gone');
  });

  it('창 제목은 고른 탭의 제목 뒤에 앱 이름을 붙인다', () => {
    expect(
      getChromeWindowTitle(workspace, {
        app: 'chrome',
        tabs: [{ kind: 'new-tab' }, { kind: 'post', slug: 'a' }],
        activeTabIndex: 1,
      }),
    ).toBe('가 - Chrome');
  });
});
