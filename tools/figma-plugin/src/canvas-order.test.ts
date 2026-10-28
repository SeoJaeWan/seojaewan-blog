import { describe, expect, it } from 'vitest';

import { compareRankPaths, readingOrder } from './canvas-order';

/**
 * 상자를 만든다.
 * @param id 노드 ID
 * @param x 왼쪽
 * @param y 위쪽
 * @param height 높이
 * @returns 상자
 */
function box(id: string, x: number, y: number, height = 100) {
  return { id, x, y, width: 100, height };
}

// @codocs [[피그마 연동:플러그인 화면]]
describe('대상 목록: 묶음 안은 피그마 캔버스 순서', () => {
  it('위에서 아래로 행을 나누고 행 안은 왼쪽에서 오른쪽으로 읽는다', () => {
    expect(
      readingOrder([box('c', 0, 300), box('b', 200, 0), box('a', 0, 0), box('d', 200, 300)]),
    ).toEqual(['a', 'b', 'c', 'd']);
  });

  it('위쪽 끝이 조금 어긋나도 세로로 겹치면 같은 행으로 본다', () => {
    expect(readingOrder([box('right', 200, 0), box('left', 0, 12)])).toEqual(['left', 'right']);
  });

  it('지금 행의 아래쪽 끝에서 시작하면 다음 행이다', () => {
    expect(readingOrder([box('next', 0, 100), box('first', 300, 0)])).toEqual(['first', 'next']);
  });

  it('바깥 묶음의 순서가 먼저고, 같은 묶음 안에서 안쪽 순서를 본다', () => {
    const paths = [
      { id: 'b-1', path: [1, 0] },
      { id: 'a-2', path: [0, 1] },
      { id: 'a-1', path: [0, 0] },
      { id: 'top', path: [0] },
    ];
    expect([...paths].sort((a, b) => compareRankPaths(a.path, b.path)).map(({ id }) => id)).toEqual(
      ['top', 'a-1', 'a-2', 'b-1'],
    );
  });
});
