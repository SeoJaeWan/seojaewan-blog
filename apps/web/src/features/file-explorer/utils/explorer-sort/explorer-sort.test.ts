import { describe, expect, it } from 'vitest';

import {
  createInitialWorkspace,
  type PlacedItem,
  RECYCLE_BIN_ID,
} from '@/shared/utils/workspace-rules/workspace-rules';

import {
  formatModifiedDate,
  getItemTypeLabel,
  getSortAfterColumnClick,
  getSortColumn,
  sortExplorerItems,
} from './explorer-sort';

const workspace = createInitialWorkspace({ posts: [], links: [] });

/**
 * 정렬 시험용 항목을 만든다.
 * @param id 항목 id(이름과 같다)
 * @param kind 종류
 * @param date 날짜
 * @returns 항목
 */
function item(id: string, kind: 'folder' | 'post', date: string | null = null): PlacedItem {
  const base = { id, name: id, parentId: null, trash: null };
  return kind === 'folder'
    ? { ...base, kind, date }
    : { ...base, kind, slug: id, date: date ?? '2026-01-01' };
}

/**
 * 휴지통에 보낸 글 항목을 만든다.
 * @param id 항목 id(이름과 같다)
 * @param deletedAt 삭제한 시각
 * @returns 항목
 */
function trashed(id: string, deletedAt: string): PlacedItem {
  return {
    ...item(id, 'post', '2020-01-01'),
    parentId: RECYCLE_BIN_ID,
    trash: { originalParentId: null, deletedAt },
  };
}

/**
 * 정렬한 이름들.
 * @param items 항목
 * @param sortBy 정렬 기준
 * @param sortDirection 방향
 * @returns 이름
 */
function names(
  items: readonly PlacedItem[],
  sortBy: 'name' | 'modified' | 'type',
  sortDirection: 'asc' | 'desc' = 'asc',
): string[] {
  return sortExplorerItems(items, { sortBy, sortDirection }, workspace).map((entry) => entry.name);
}

// @codocs [[파일 탐색기:보기와 정렬]]
describe('파일 탐색기:보기와 정렬', () => {
  it('폴더를 늘 항목보다 앞에 둔다', () => {
    expect(names([item('a', 'post'), item('z', 'folder')], 'name')).toEqual(['z', 'a']);
  });

  it('내림차순이어도 폴더를 앞에 둔다', () => {
    expect(names([item('a', 'post'), item('z', 'folder')], 'name', 'desc')).toEqual(['z', 'a']);
  });

  it('이름 오름차순은 숫자를 값으로 비교한다', () => {
    expect(names([item('10', 'post'), item('2', 'post')], 'name')).toEqual(['2', '10']);
  });

  it('이름 내림차순은 차례를 뒤집는다', () => {
    expect(names([item('a', 'post'), item('b', 'post')], 'name', 'desc')).toEqual(['b', 'a']);
  });

  it('수정한 날짜 오름차순은 오래된 것이 앞이다', () => {
    const items = [item('new', 'post', '2026-10-02'), item('old', 'post', '2026-10-01')];
    expect(names(items, 'modified')).toEqual(['old', 'new']);
  });

  it('수정한 날짜가 없는 항목은 내림차순이어도 뒤에 둔다', () => {
    const items = [item('none', 'folder'), item('dated', 'folder', '2026-10-01')];
    expect(names(items, 'modified', 'desc')).toEqual(['dated', 'none']);
  });

  it('같은 값이면 이름 오름차순이다', () => {
    const items = [item('b', 'post', '2026-10-01'), item('a', 'post', '2026-10-01')];
    expect(names(items, 'modified', 'desc')).toEqual(['a', 'b']);
  });

  it('휴지통의 수정한 날짜 정렬은 삭제한 날짜로 한다', () => {
    const items = [
      trashed('late', '2026-10-02T00:00:00Z'),
      trashed('early', '2026-10-01T00:00:00Z'),
    ];
    expect(
      sortExplorerItems(items, { sortBy: 'modified', sortDirection: 'asc' }, workspace, true).map(
        (entry) => entry.name,
      ),
    ).toEqual(['early', 'late']);
  });

  it('유형 글자는 폴더 "파일 폴더", 글 "블로그 글", 외부 링크 "인터넷 바로 가기"다', () => {
    expect([
      getItemTypeLabel('folder'),
      getItemTypeLabel('post'),
      getItemTypeLabel('link'),
    ]).toEqual(['파일 폴더', '블로그 글', '인터넷 바로 가기']);
  });

  it('글의 수정한 날짜는 작성일 그대로다', () => {
    expect(formatModifiedDate('2026-10-20')).toBe('2026-10-20');
  });

  it('날짜가 없으면 수정한 날짜 칸은 비어 있다', () => {
    expect(formatModifiedDate(null)).toBe('');
  });

  it('열 제목을 누르면 그 열의 오름차순으로 정렬한다', () => {
    expect(getSortAfterColumnClick({ sortBy: 'name', sortDirection: 'asc' }, 'type')).toEqual({
      sortBy: 'type',
      sortDirection: 'asc',
    });
  });

  it('정렬 중인 열 제목을 다시 누르면 방향을 뒤집는다', () => {
    expect(getSortAfterColumnClick({ sortBy: 'name', sortDirection: 'asc' }, 'name')).toEqual({
      sortBy: 'name',
      sortDirection: 'desc',
    });
  });

  it('휴지통 자세히 보기의 수정한 날짜 정렬은 삭제한 날짜 열에 표시한다', () => {
    expect(getSortColumn('modified', true)).toBe('deletedDate');
  });
});
