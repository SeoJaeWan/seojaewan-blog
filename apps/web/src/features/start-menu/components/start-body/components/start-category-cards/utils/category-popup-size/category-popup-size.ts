// 범주 카드의 펼침 팝업 크기를 정하는 규칙이다.

/** 펼침 팝업의 크기(px). 팝업 요소의 style로 준다 */
export type CategoryPopupSize = {
  width: number;
  maxHeight: number;
};

/** 펼침 팝업 격자의 열 수 */
export const CATEGORY_POPUP_COLUMNS = 4;

/**
 * 펼침 팝업 너비를 정한다. 항목 칸 4열과 팝업 좌우 안쪽 여백을 더한 너비이고, 카드 격자보다 넓으면 격자 너비다.
 * @codocs [[Start 메뉴:모두]]
 * @param rowWidth 카드 격자 너비
 * @param tileWidth 항목 칸 너비
 * @param paddingX 팝업 좌우 안쪽 여백의 합
 * @returns 팝업 너비
 */
export function getCategoryPopupWidth(
  rowWidth: number,
  tileWidth: number,
  paddingX: number,
): number {
  return Math.min(rowWidth, tileWidth * CATEGORY_POPUP_COLUMNS + paddingX);
}

/**
 * 펼침 팝업의 최대 높이를 정한다. 팝업 위쪽(카드 위쪽)에서 Start 본문 스크롤 영역 아래 끝까지다. 넘치면 팝업 안에서 스크롤한다.
 * @codocs [[Start 메뉴:모두]]
 * @param cardTop 카드 위쪽(화면 기준)
 * @param areaBottom 스크롤 영역 아래 끝(화면 기준)
 * @returns 팝업 최대 높이
 */
export function getCategoryPopupMaxHeight(cardTop: number, areaBottom: number): number {
  return Math.max(0, areaBottom - cardTop);
}

/**
 * 그려진 팝업과 카드로 팝업 크기를 잰다. 항목 칸 너비는 팝업 안 첫 칸, 스크롤 영역은 카드를 담은 가장 가까운 세로 스크롤 요소다.
 * @param folder 팝업 요소
 * @param row 카드 격자 요소
 * @param card 팝업을 연 카드 요소
 * @returns 팝업 크기
 */
export function getCategoryPopupSize(
  folder: HTMLElement,
  row: HTMLElement,
  card: HTMLElement,
): CategoryPopupSize {
  const view = folder.ownerDocument.defaultView;
  const style = view?.getComputedStyle(folder);
  const paddingX =
    Number.parseFloat(style?.paddingLeft ?? '0') + Number.parseFloat(style?.paddingRight ?? '0');
  const tile = folder.querySelector<HTMLElement>('[data-start-tile-id]');
  const width =
    tile === null
      ? row.clientWidth
      : getCategoryPopupWidth(row.clientWidth, tile.offsetWidth, paddingX);
  const area = findScrollArea(card);
  const areaBottom = area?.getBoundingClientRect().bottom ?? view?.innerHeight ?? 0;
  return {
    width,
    maxHeight: getCategoryPopupMaxHeight(card.getBoundingClientRect().top, areaBottom),
  };
}

/**
 * 요소를 담은 가장 가까운 세로 스크롤 요소를 찾는다.
 * @param element 요소
 * @returns 스크롤 요소. 없으면 null
 */
function findScrollArea(element: HTMLElement): HTMLElement | null {
  const view = element.ownerDocument.defaultView;
  for (let parent = element.parentElement; parent !== null; parent = parent.parentElement) {
    const overflowY = view?.getComputedStyle(parent).overflowY;
    if (overflowY === 'auto' || overflowY === 'scroll') {
      return parent;
    }
  }
  return null;
}
