import { describe, expect, it } from 'vitest';

import {
  arrangeInGridOrder,
  getCellAtIndex,
  getCellOrigin,
  getFirstFreeCell,
  getGridOrder,
  getGridSize,
  getNearestCell,
  layoutDesktopIcons,
  moveIconsToCell,
  placeIcons,
  sortDesktopItems,
} from './desktop-grid';

const GRID = { columns: 3, rows: 2 } as const;

const ITEMS = [
  { id: 'link:b', kind: 'link', name: 'GitHub', date: null },
  { id: 'post:a', kind: 'post', name: '가 글', date: '2026-10-20' },
  { id: 'recycle-bin', kind: 'recycle-bin', name: '휴지통', date: null },
  { id: 'folder:z', kind: 'folder', name: 'Z', date: '2026-10-27T00:00:00.000Z' },
  { id: 'blog', kind: 'folder', name: 'Blog', date: null },
] as const;

/**
 * 정렬한 항목의 id를 돌려준다.
 * @param sortBy 정렬 기준
 * @returns 항목 id
 */
function sortedIds(sortBy: 'name' | 'type' | 'modified'): string[] {
  return sortDesktopItems(ITEMS, sortBy).map((item) => item.id);
}

// @codocs [[바탕화면:아이콘 배치]]
describe('바탕화면:아이콘 배치', () => {
  it('격자 순서는 위에서 아래, 그다음 왼쪽에서 오른쪽(열 우선)이다', () => {
    expect([0, 1, 2, 3].map((index) => getCellAtIndex(index, GRID))).toEqual([
      { column: 0, row: 0 },
      { column: 0, row: 1 },
      { column: 1, row: 0 },
      { column: 1, row: 1 },
    ]);
  });

  it('자동 정렬은 항목을 격자 순서대로 채운다', () => {
    expect(arrangeInGridOrder(['a', 'b', 'c'], GRID)).toEqual({
      a: { column: 0, row: 0 },
      b: { column: 0, row: 1 },
      c: { column: 1, row: 0 },
    });
  });

  it('격자 칸 수는 아이콘이 영역 밖으로 잘리지 않는 칸만 센다. 영역이 작아도 1×1이다', () => {
    // 보통 아이콘: 76×74, 간격 16, 가장자리 8
    expect(getGridSize({ width: 1024, height: 720 }, 'medium')).toEqual({ columns: 11, rows: 8 });
    expect(getGridSize({ width: 10, height: 10 }, 'large')).toEqual({ columns: 1, rows: 1 });
  });

  it('아이콘 크기마다 칸 크기가 다르다(큰·보통·작은 아이콘)', () => {
    const cell = { column: 1, row: 1 };
    expect(getCellOrigin(cell, 'large')).toEqual({ x: 136, y: 146 });
    expect(getCellOrigin(cell, 'medium')).toEqual({ x: 100, y: 98 });
    expect(getCellOrigin(cell, 'small')).toEqual({ x: 100, y: 82 });
  });

  it('놓은 자리에서 가장 가까운 칸을 찾고, 격자 밖이면 가장자리 칸이다', () => {
    expect(getNearestCell({ x: 95, y: 10 }, 'medium', GRID)).toEqual({ column: 1, row: 0 });
    expect(getNearestCell({ x: 5000, y: -50 }, 'medium', GRID)).toEqual({ column: 2, row: 0 });
  });

  it('자동 정렬을 끄면 저장한 칸에 두고, 칸이 없는 새 항목은 격자 순서의 첫 빈 칸에 둔다', () => {
    const cells = placeIcons(['a', 'b'], { a: { column: 0, row: 0 } }, GRID);
    expect(cells).toEqual({ a: { column: 0, row: 0 }, b: { column: 0, row: 1 } });
    expect(getFirstFreeCell(cells, GRID)).toEqual({ column: 1, row: 0 });
  });

  it('같은 칸에 저장한 항목이 겹치면 뒤 항목은 빈 칸으로 간다', () => {
    const same = { column: 1, row: 1 };
    expect(placeIcons(['a', 'b'], { a: same, b: same }, GRID)).toEqual({
      a: same,
      b: { column: 0, row: 0 },
    });
  });

  it('화면이 작아져 칸이 사라지면 가장 가까운 빈 칸(거리가 같으면 격자 순서가 앞인 칸)으로 옮기고, 저장한 칸은 바꾸지 않는다', () => {
    const positions = { a: { column: 5, row: 1 }, b: { column: 2, row: 1 } };
    expect(placeIcons(['a', 'b'], positions, GRID)).toEqual({
      a: { column: 1, row: 1 },
      b: { column: 2, row: 1 },
    });
    expect(positions.a).toEqual({ column: 5, row: 1 });
  });

  it('자동 정렬이 켜져 있으면 저장한 칸과 상관없이 정렬 기준의 차례로 채운다', () => {
    const cells = layoutDesktopIcons(
      ITEMS,
      { isAutoArrange: true, sortBy: 'name', positions: { blog: { column: 2, row: 1 } } },
      GRID,
    );
    expect(getGridOrder(cells, GRID)).toEqual(sortedIds('name'));
  });

  it('끈 아이콘들은 잡은 아이콘과의 칸 차이를 지켜 옮기고, 차지한 칸이면 가장 가까운 빈 칸으로 간다', () => {
    const cells = {
      a: { column: 0, row: 0 },
      b: { column: 0, row: 1 },
      c: { column: 2, row: 1 },
    };
    expect(moveIconsToCell(cells, ['a', 'b'], 'a', { column: 1, row: 0 }, GRID)).toEqual({
      a: { column: 1, row: 0 },
      b: { column: 1, row: 1 },
      c: { column: 2, row: 1 },
    });
    expect(moveIconsToCell(cells, ['a'], 'a', { column: 2, row: 1 }, GRID).a).toEqual({
      column: 1,
      row: 1,
    });
  });
});

// @codocs [[바탕화면:빈 곳 우클릭 메뉴]]
describe('바탕화면:빈 곳 우클릭 메뉴', () => {
  it('이름순은 휴지통을 맨 앞, 폴더를 먼저 두고, 영어가 한글보다 앞이다', () => {
    expect(sortedIds('name')).toEqual(['recycle-bin', 'blog', 'folder:z', 'link:b', 'post:a']);
  });

  it('항목 유형순은 폴더, 글, 외부 링크 차례다', () => {
    expect(sortedIds('type')).toEqual(['recycle-bin', 'blog', 'folder:z', 'post:a', 'link:b']);
  });

  it('수정한 날짜순은 최근 것을 먼저, 날짜가 없는 항목은 뒤에 이름순으로 둔다', () => {
    expect(sortedIds('modified')).toEqual(['recycle-bin', 'folder:z', 'post:a', 'blog', 'link:b']);
  });
});
