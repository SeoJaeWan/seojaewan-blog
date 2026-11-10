import { describe, expect, it } from 'vitest';

import { getCategoryPageCount, getCategoryPageOfTile, getNextCategoryPage } from './category-pages';

// @codocs [[Start 메뉴:모두]]
describe('Start 메뉴:모두 - 범주 펼침 팝업 쪽 넘김', () => {
  it('한 쪽은 4열 × 3줄(12개)이고, 넘지 않으면 한 쪽이다', () => {
    expect(getCategoryPageCount(0)).toBe(1);
    expect(getCategoryPageCount(12)).toBe(1);
    expect(getCategoryPageCount(13)).toBe(2);
    expect(getCategoryPageCount(25)).toBe(3);
  });

  it('항목 칸 순서로 그 칸의 쪽을 정한다', () => {
    expect(getCategoryPageOfTile(11)).toBe(0);
    expect(getCategoryPageOfTile(12)).toBe(1);
  });

  it('휠 한 번에 한 쪽만 넘기고, 아래로 굴리면 다음 쪽·위로 굴리면 앞 쪽이다', () => {
    expect(getNextCategoryPage(0, 3, 100)).toBe(1);
    expect(getNextCategoryPage(0, 3, 400)).toBe(1);
    expect(getNextCategoryPage(2, 3, -100)).toBe(1);
  });

  it('첫 쪽에서 앞으로, 마지막 쪽에서 뒤로는 넘기지 않는다', () => {
    expect(getNextCategoryPage(0, 3, -100)).toBe(0);
    expect(getNextCategoryPage(2, 3, 100)).toBe(2);
    expect(getNextCategoryPage(0, 1, 100)).toBe(0);
  });
});
