import { describe, expect, it } from 'vitest';

import {
  BLOG_FOLDER_ID,
  createInitialWorkspace,
  RECYCLE_BIN_ID,
  trashItems,
  type WorkspaceState,
} from '@/shared/utils/workspace-rules/workspace-rules';

import { getItemLocationLabel, searchItems } from './explorer-search';

const workspace = createInitialWorkspace({
  posts: [
    { slug: 'a', title: '리액트 훅', folderPath: ['React'], date: '2026-10-20' },
    { slug: 'b', title: '훅 정리', folderPath: ['React', 'Hooks'], date: '2026-10-22' },
    { slug: 'c', title: '훅', folderPath: [], date: '2026-10-01' },
    { slug: 'd', title: '훅 모음', folderPath: ['Next.js'], date: '2026-10-25' },
  ],
  links: [],
});

/**
 * 검색 결과 이름들.
 * @param state 작업 공간
 * @param location 위치
 * @param query 검색어
 * @returns 이름
 */
function names(state: WorkspaceState, location: string | null, query: string): string[] {
  return searchItems(state, location, query).map((item) => item.name);
}

// @codocs [[파일 탐색기:폴더 안 검색]]
describe('파일 탐색기:폴더 안 검색', () => {
  it('현재 폴더와 그 하위 폴더 전체에서 찾는다', () => {
    expect(names(workspace, 'folder:React', '정리')).toEqual(['훅 정리']);
  });

  it('현재 폴더 밖의 항목은 찾지 않는다', () => {
    expect(names(workspace, 'folder:React', '모음')).toEqual([]);
  });

  it('일치 단계(같음, 시작, 포함) 차례로 둔다', () => {
    expect(names(workspace, BLOG_FOLDER_ID, '훅')).toEqual([
      '훅',
      '훅 모음',
      '훅 정리',
      '리액트 훅',
    ]);
  });

  it('같은 단계의 글은 최신순이다', () => {
    expect(names(workspace, BLOG_FOLDER_ID, '훅').slice(1, 3)).toEqual(['훅 모음', '훅 정리']);
  });

  it('휴지통에서는 휴지통에 보낸 항목과 그 안에서 찾는다', () => {
    const result = trashItems(workspace, ['folder:React'], '2026-10-28T00:00:00Z');
    const trashed = result.ok ? result.state : workspace;
    expect(names(trashed, RECYCLE_BIN_ID, '훅')).toEqual(['훅 정리', '리액트 훅']);
  });

  it('바탕화면에서 찾을 때 휴지통 안의 항목은 빼 놓는다', () => {
    const result = trashItems(workspace, ['folder:Next.js'], '2026-10-28T00:00:00Z');
    const trashed = result.ok ? result.state : workspace;
    expect(names(trashed, null, '모음')).toEqual([]);
  });

  it('위치 열은 바탕 화면부터 항목이 놓인 폴더까지다', () => {
    expect(getItemLocationLabel(workspace, 'folder:React/Hooks')).toBe(
      '바탕 화면\\Blog\\React\\Hooks',
    );
  });

  it('휴지통 안 항목의 위치 열은 휴지통부터다', () => {
    const result = trashItems(workspace, ['folder:React'], '2026-10-28T00:00:00Z');
    const trashed = result.ok ? result.state : workspace;
    expect(getItemLocationLabel(trashed, 'folder:React')).toBe('휴지통\\React');
  });
});
