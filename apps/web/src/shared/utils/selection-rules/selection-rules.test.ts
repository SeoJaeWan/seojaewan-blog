import { describe, expect, it } from 'vitest';

import {
  emptySelection,
  getIdAfterRemoval,
  getNeighborInGrid,
  getRectFromPoints,
  isRectIntersecting,
  pruneSelection,
  selectAll,
  selectMarquee,
  selectOnly,
  selectRange,
  toggleSelection,
} from './selection-rules';

const ORDER = ['a', 'b', 'c', 'd', 'e'] as const;

// @codocs [[바탕화면:아이콘 조작]]
describe('바탕화면:아이콘 조작', () => {
  it('클릭하면 그 항목만 고르고 범위 선택의 시작이 된다', () => {
    expect(selectOnly('b')).toEqual({ ids: ['b'], anchorId: 'b', focusId: 'b' });
  });

  it('Ctrl + 클릭은 선택에 더하거나 뺀다', () => {
    const added = toggleSelection(selectOnly('a'), 'c');
    expect(added.ids).toEqual(['a', 'c']);
    expect(toggleSelection(added, 'a').ids).toEqual(['c']);
  });

  it('Shift + 클릭은 마지막으로 고른 항목부터 클릭한 항목까지 표시 순서로 고른다', () => {
    expect(selectRange(selectOnly('b'), ORDER, 'd').ids).toEqual(['b', 'c', 'd']);
    expect(selectRange(selectOnly('d'), ORDER, 'b').ids).toEqual(['b', 'c', 'd']);
  });

  it('Shift 범위를 다시 바꿔도 시작 항목은 그대로다', () => {
    const first = selectRange(selectOnly('c'), ORDER, 'e');
    expect(selectRange(first, ORDER, 'a').ids).toEqual(['a', 'b', 'c']);
  });

  it('시작 항목이 없으면 Shift + 클릭은 그 항목만 고른다', () => {
    expect(selectRange(emptySelection, ORDER, 'c').ids).toEqual(['c']);
  });

  it('Ctrl + A는 모두 고른다', () => {
    expect(selectAll(emptySelection, ORDER).ids).toEqual(ORDER);
  });

  it('끄는 사각형은 걸친 항목을 고르고, Ctrl이면 끌기 전 선택에 더한다', () => {
    expect(selectMarquee(selectOnly('a'), ['c', 'd'], false).ids).toEqual(['c', 'd']);
    expect(selectMarquee(selectOnly('a'), ['c', 'd'], true).ids).toEqual(['a', 'c', 'd']);
  });

  it('사라진 항목은 선택에서 빠진다', () => {
    const selection = { ids: ['a', 'b'], anchorId: 'b', focusId: 'b' };
    expect(pruneSelection(selection, ['a'])).toEqual({ ids: ['a'], anchorId: null, focusId: null });
    expect(pruneSelection(selection, ORDER)).toBe(selection);
  });

  it('지운 뒤에는 표시 순서의 다음 항목, 없으면 이전 항목, 그것도 없으면 영역(null)으로 옮긴다', () => {
    expect(getIdAfterRemoval(ORDER, ['b', 'c'])).toBe('d');
    expect(getIdAfterRemoval(ORDER, ['e'])).toBe('d');
    expect(getIdAfterRemoval(ORDER, ['d', 'a', 'e'])).toBe('c');
    expect(getIdAfterRemoval(['a'], ['a'])).toBeNull();
  });

  it('방향키는 격자에서 그 방향의 옆 항목으로 옮기고, 같은 줄의 항목을 먼저 고른다', () => {
    const cells = {
      a: { column: 0, row: 0 },
      b: { column: 0, row: 1 },
      c: { column: 1, row: 0 },
      d: { column: 2, row: 1 },
    };
    expect(getNeighborInGrid(cells, 'a', 'down')).toBe('b');
    expect(getNeighborInGrid(cells, 'b', 'up')).toBe('a');
    expect(getNeighborInGrid(cells, 'a', 'right')).toBe('c');
    expect(getNeighborInGrid(cells, 'b', 'right')).toBe('d');
    expect(getNeighborInGrid(cells, 'c', 'right')).toBe('d');
  });

  it('그 방향에 항목이 없으면 옮기지 않는다', () => {
    const cells = { a: { column: 0, row: 0 }, b: { column: 0, row: 1 } };
    expect(getNeighborInGrid(cells, 'a', 'up')).toBeNull();
    expect(getNeighborInGrid(cells, 'a', 'left')).toBeNull();
  });

  it('끄는 사각형은 두 점 어느 방향으로 끌어도 같은 사각형이고, 겹친 항목을 찾는다', () => {
    const rect = getRectFromPoints({ x: 50, y: 40 }, { x: 10, y: 0 });
    expect(rect).toEqual({ x: 10, y: 0, width: 40, height: 40 });
    expect(isRectIntersecting(rect, { x: 45, y: 35, width: 10, height: 10 })).toBe(true);
    expect(isRectIntersecting(rect, { x: 50, y: 0, width: 10, height: 10 })).toBe(false);
  });
});
