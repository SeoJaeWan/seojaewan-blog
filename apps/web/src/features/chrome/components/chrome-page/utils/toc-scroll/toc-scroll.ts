// 목차가 지금 읽는 위치 항목을 보이도록 목차 안에서만 스크롤하는 규칙이다.

/** 화면 위 세로 범위(px). 목차 항목 목록은 지금 스크롤 위치(scrollTop)도 갖는다 */
type VerticalRange = {
  top: number;
  bottom: number;
};

/**
 * 지금 읽는 위치 항목이 목차 항목 목록 안에 보이도록 목록의 새 스크롤 위치를 정한다. 이미 보이면 그대로다.
 * 위로 가려졌으면 항목 위쪽을 목록 위쪽에, 아래로 가려졌으면 항목 아래쪽을 목록 아래쪽에 맞춘다.
 * 목록만 스크롤하고 페이지는 스크롤하지 않기 위해 `scrollIntoView` 대신 쓴다.
 * @codocs [[Chrome:글 화면]]
 * @param list 목차 항목 목록의 화면 위 범위와 지금 스크롤 위치
 * @param list.scrollTop 목록의 지금 스크롤 위치
 * @param item 지금 읽는 위치 항목의 화면 위 범위
 * @returns 목록의 새 스크롤 위치
 */
export function getTocScrollTop(
  list: VerticalRange & { scrollTop: number },
  item: VerticalRange,
): number {
  if (item.top < list.top) {
    return list.scrollTop - (list.top - item.top);
  }
  if (item.bottom > list.bottom) {
    return list.scrollTop + (item.bottom - list.bottom);
  }
  return list.scrollTop;
}
