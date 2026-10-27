import { describe, expect, it } from 'vitest';

import {
  createInitialWorkspace,
  getPostItemId,
  trashItems,
  type WorkspaceState,
} from '@/shared/utils/workspace-rules/workspace-rules';
import { GITHUB_LINK, NOW } from '@/shared/utils/workspace-rules/workspace-rules.fixture';

import {
  getSearchDisplayOrder,
  groupSearchResults,
  moveSearchSelection,
  searchWorkspace,
} from './search-rules';

const workspace = createInitialWorkspace({
  posts: [
    { slug: 'a', title: '리액트 훅', folderPath: ['React'], date: '2026-10-20' },
    { slug: 'b', title: '훅 정리', folderPath: ['React', 'Hooks'], date: '2026-10-22' },
    { slug: 'c', title: '훅', folderPath: [], date: '2026-10-01' },
    { slug: 'd', title: '훅 모음', folderPath: ['Next.js'], date: '2026-10-25' },
    { slug: 'e', title: '리액트 쿼리', folderPath: [], date: '2026-10-10' },
  ],
  links: [GITHUB_LINK, { ...GITHUB_LINK, id: 'hook-study', name: '훅 스터디' }],
});

/**
 * 검색 결과 이름들.
 * @param state 작업 공간
 * @param query 검색어
 * @returns 이름
 */
function names(state: WorkspaceState, query: string): string[] {
  return searchWorkspace(state, query).map((item) => item.name);
}

// @codocs [[검색:일치 규칙]]
describe('검색:일치 규칙', () => {
  it('이름 전체가 같은 것이 검색어로 시작하는 것보다 앞이다', () => {
    expect(names(workspace, '훅')[0]).toBe('훅');
  });

  it('검색어로 시작하는 것이 중간에 포함하는 것보다 앞이다', () => {
    const result = names(workspace, '훅');
    expect(result.indexOf('훅 정리')).toBeLessThan(result.indexOf('리액트 훅'));
  });

  it('같은 단계 안에서 글은 최신순이다', () => {
    // 둘 다 검색어로 시작하는 글이고 '훅 모음'이 더 최근이다.
    const result = names(workspace, '훅');
    expect(result.indexOf('훅 모음')).toBeLessThan(result.indexOf('훅 정리'));
  });

  it('같은 단계 안에서 폴더와 외부 링크는 이름순이다', () => {
    const state = createInitialWorkspace({
      posts: [
        { slug: 'x', title: '정리 노트', folderPath: ['정리 B'], date: '2026-10-01' },
        { slug: 'y', title: '정리 모음', folderPath: ['정리 A'], date: '2026-10-02' },
      ],
      links: [],
    });
    const folders = searchWorkspace(state, '정리').filter((item) => item.kind === 'folder');
    expect(folders.map((item) => item.name)).toEqual(['정리 A', '정리 B']);
  });

  it('대소문자와 앞뒤 공백을 무시한다', () => {
    expect(names(workspace, '  GITHUB ')).toEqual(['GitHub']);
  });

  it('검색어가 한글 초성으로만 이루어져 있으면 이름의 초성과 비교한다', () => {
    expect(names(workspace, 'ㄹㅇㅌ')).toEqual(['리액트 훅', '리액트 쿼리']);
  });

  it('검색어가 비어 있으면 결과가 없다', () => {
    expect(names(workspace, '   ')).toEqual([]);
  });
});

// @codocs [[검색:검색 대상]]
describe('검색:검색 대상', () => {
  it('폴더, 글, 외부 링크를 이름으로 찾는다', () => {
    expect(new Set(searchWorkspace(workspace, 'React').map((item) => item.kind))).toEqual(
      new Set(['folder']),
    );
    expect(names(workspace, '리액트 쿼리')).toEqual(['리액트 쿼리']);
    expect(names(workspace, 'github')).toEqual(['GitHub']);
  });

  it('휴지통 항목은 찾지 않는다', () => {
    expect(names(workspace, '휴지통')).toEqual([]);
  });

  it('휴지통에 들어간 항목은 찾지 않는다', () => {
    const trashed = trashItems(workspace, [getPostItemId('c')], NOW);
    if (!trashed.ok) {
      throw new Error(`거부됨: ${trashed.reason}`);
    }
    expect(names(trashed.state, '훅')).not.toContain('훅');
  });

  it('휴지통에 들어간 폴더 안의 글도 찾지 않는다', () => {
    const trashed = trashItems(workspace, ['folder:React'], NOW);
    if (!trashed.ok) {
      throw new Error(`거부됨: ${trashed.reason}`);
    }
    expect(names(trashed.state, '훅 정리')).toEqual([]);
  });
});

// @codocs [[검색:결과 화면]]
describe('검색:결과 화면', () => {
  it('첫 결과가 최고 일치이고 나머지는 폴더, 글, 외부 링크로 묶는다', () => {
    const results = groupSearchResults(searchWorkspace(workspace, '훅'));
    expect(results?.bestMatch.name).toBe('훅');
    expect(results?.folders).toEqual([]);
    expect(results?.posts.map((item) => item.name)).toEqual(['훅 모음', '훅 정리', '리액트 훅']);
    expect(results?.links.map((item) => item.name)).toEqual(['훅 스터디']);
  });

  it('결과가 없으면 묶음도 없다', () => {
    expect(groupSearchResults(searchWorkspace(workspace, '없는 이름'))).toBeNull();
  });

  it('방향키는 화면에 보이는 차례(최고 일치, 폴더, 글, 외부 링크)로 움직인다', () => {
    const results = groupSearchResults(searchWorkspace(workspace, '훅'));
    if (results === null) {
      throw new Error('결과가 없다');
    }
    expect(getSearchDisplayOrder(results).map((item) => item.name)).toEqual([
      '훅',
      '훅 모음',
      '훅 정리',
      '리액트 훅',
      '훅 스터디',
    ]);
  });

  it('아래 방향키로 고른 항목을 아래로 옮긴다', () => {
    expect(moveSearchSelection(0, 1, 3)).toBe(1);
  });

  it('위 방향키로 고른 항목을 위로 옮긴다', () => {
    expect(moveSearchSelection(2, -1, 3)).toBe(1);
  });

  it('끝에서 아래로 옮기면 멈춘다', () => {
    expect(moveSearchSelection(2, 1, 3)).toBe(2);
  });

  it('처음에서 위로 옮기면 멈춘다', () => {
    expect(moveSearchSelection(0, -1, 3)).toBe(0);
  });

  it('결과가 없으면 처음에 머문다', () => {
    expect(moveSearchSelection(0, 1, 0)).toBe(0);
  });
});
