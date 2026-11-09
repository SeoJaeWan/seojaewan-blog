import { describe, expect, it } from 'vitest';

import { getCategoryPopupMaxHeight, getCategoryPopupWidth } from './category-popup-size';

// @codocs [[Start 메뉴:모두]]
describe('Start 메뉴:모두 - 범주 펼침 팝업 크기', () => {
  it('항목 칸 4열과 안쪽 여백을 더한 너비이고, 카드 격자보다 넓으면 격자 너비다', () => {
    expect(getCategoryPopupWidth(578, 95, 32)).toBe(412);
    expect(getCategoryPopupWidth(356, 89, 32)).toBe(356);
  });

  it('최대 높이는 카드 위쪽에서 스크롤 영역 아래 끝까지다', () => {
    expect(getCategoryPopupMaxHeight(300, 700)).toBe(400);
    expect(getCategoryPopupMaxHeight(800, 700)).toBe(0);
  });
});
