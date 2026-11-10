// 범주 펼침 팝업의 쪽 넘김 규칙이다.

/** 펼침 팝업 한 쪽에 들어가는 항목 수(4열 × 3줄) */
export const CATEGORY_PAGE_TILE_COUNT = 12;

/**
 * 항목 수로 쪽 수를 정한다. 항목이 한 쪽을 넘지 않으면 한 쪽이다.
 * @codocs [[Start 메뉴:모두]]
 * @param itemCount 범주의 항목 수
 * @returns 쪽 수(1 이상)
 */
export function getCategoryPageCount(itemCount: number): number {
  return Math.max(1, Math.ceil(itemCount / CATEGORY_PAGE_TILE_COUNT));
}

/**
 * 항목 칸 순서로 그 칸이 놓인 쪽을 정한다.
 * @codocs [[Start 메뉴:모두]]
 * @param tileIndex 항목 칸 순서(0부터)
 * @returns 쪽 순서(0부터)
 */
export function getCategoryPageOfTile(tileIndex: number): number {
  return Math.floor(tileIndex / CATEGORY_PAGE_TILE_COUNT);
}

/**
 * 휠 한 번에 넘어갈 쪽을 정한다. 아래로 굴리면 다음 쪽, 위로 굴리면 앞 쪽이고, 한 번에 한 쪽만 넘긴다.
 * 첫 쪽에서 앞으로, 마지막 쪽에서 뒤로는 넘기지 않는다(스크롤 끝처럼 움직이지 않는다).
 * @codocs [[Start 메뉴:모두]]
 * @param page 지금 쪽(0부터)
 * @param pageCount 쪽 수
 * @param deltaY 휠의 세로 이동량. 양수는 아래로
 * @returns 넘어갈 쪽. 넘기지 않으면 지금 쪽
 */
export function getNextCategoryPage(page: number, pageCount: number, deltaY: number): number {
  if (deltaY > 0) {
    return Math.min(page + 1, pageCount - 1);
  }
  if (deltaY < 0) {
    return Math.max(page - 1, 0);
  }
  return page;
}
