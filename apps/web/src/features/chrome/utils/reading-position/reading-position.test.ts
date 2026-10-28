import { describe, expect, it } from 'vitest';

import { getActiveHeadingIndex } from './reading-position';

const tops = [100, 600, 1200];

// @codocs [[Chrome:글 화면]]
describe('Chrome:글 화면', () => {
  it('첫 제목에 닿기 전에는 첫 제목을 읽는 중이다', () => {
    expect(
      getActiveHeadingIndex(tops, { scrollTop: 0, clientHeight: 500, scrollHeight: 2000 }),
    ).toBe(0);
  });

  it('스크롤 상자 위쪽을 지난 마지막 제목을 읽는 중이다', () => {
    expect(
      getActiveHeadingIndex(tops, { scrollTop: 700, clientHeight: 500, scrollHeight: 2000 }),
    ).toBe(1);
  });

  it('끝까지 스크롤하면 마지막 제목을 읽는 중이다', () => {
    expect(
      getActiveHeadingIndex(tops, { scrollTop: 1000, clientHeight: 500, scrollHeight: 1500 }),
    ).toBe(2);
  });

  it('제목이 없으면 -1이다', () => {
    expect(getActiveHeadingIndex([], { scrollTop: 0, clientHeight: 500, scrollHeight: 500 })).toBe(
      -1,
    );
  });
});
