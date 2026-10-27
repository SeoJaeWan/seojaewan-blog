import { describe, expect, it } from 'vitest';

import { createChromeContent, openChromeTab } from '@/shared/utils/chrome-tabs/chrome-tabs';
import { createInitialWorkspace } from '@/shared/utils/workspace-rules/workspace-rules';

import { getChromeTabTitle, getChromeWindowTitle } from './chrome-tab-title';

const workspace = createInitialWorkspace({
  posts: [{ slug: 'a', title: '가', folderPath: [], date: '2026-10-20' }],
  links: [],
});

// @codocs [[Chrome:구성]]
describe('Chrome:구성', () => {
  it('탭 제목은 새 탭 페이지면 "새 탭"이다', () => {
    expect(getChromeTabTitle(workspace, { kind: 'new-tab' })).toBe('새 탭');
  });

  it('탭 제목은 글이면 글 제목이다', () => {
    expect(getChromeTabTitle(workspace, { kind: 'post', slug: 'a' })).toBe('가');
  });

  it('탭 제목은 검색 결과면 "<검색어> - 검색"이다', () => {
    expect(getChromeTabTitle(workspace, { kind: 'search', query: '리액트' })).toBe('리액트 - 검색');
  });

  it('탭 제목은 찾을 수 없음 화면과 색인에 없는 글이면 "페이지를 찾을 수 없음"이다', () => {
    expect(getChromeTabTitle(workspace, { kind: 'not-found', url: '/posts/x' })).toBe(
      '페이지를 찾을 수 없음',
    );
    expect(getChromeTabTitle(workspace, { kind: 'post', slug: 'gone' })).toBe(
      '페이지를 찾을 수 없음',
    );
  });

  it('창 제목은 고른 탭의 제목 뒤에 앱 이름을 붙인다', () => {
    const content = openChromeTab(createChromeContent(), { kind: 'post', slug: 'a' });
    expect(getChromeWindowTitle(workspace, content)).toBe('가 - Chrome');
  });
});
