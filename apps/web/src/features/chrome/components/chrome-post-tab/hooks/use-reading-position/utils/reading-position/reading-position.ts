/** 스크롤 상자의 지금 상태(px) */
export type ScrollMetrics = {
  /** 스크롤한 거리 */
  scrollTop: number;
  /** 보이는 높이 */
  clientHeight: number;
  /** 내용 전체 높이 */
  scrollHeight: number;
};

/** 제목이 이만큼(px) 위로 올라오면 그 제목을 읽는 중으로 본다 */
export const READING_OFFSET = 32;

/**
 * 지금 읽는 목차 항목을 정한다. 스크롤 상자 위쪽(조금 아래 여유 포함)을 지난 마지막 제목이고, 아직 첫 제목에 닿지 않았으면 첫 제목이다.
 * 끝까지 스크롤했으면 마지막 제목이다(마지막 제목이 위쪽까지 올라오지 못하는 짧은 글).
 * @codocs [[Chrome:글 화면]]
 * @param headingTops 제목마다 스크롤 상자 안 위쪽 자리(px). 본문 차례대로다
 * @param metrics 스크롤 상자의 지금 상태
 * @returns 지금 읽는 제목의 차례. 제목이 없으면 -1
 */
export function getActiveHeadingIndex(
  headingTops: readonly number[],
  metrics: ScrollMetrics,
): number {
  if (headingTops.length === 0) {
    return -1;
  }
  if (
    metrics.scrollTop + metrics.clientHeight >= metrics.scrollHeight - 1 &&
    metrics.scrollTop > 0
  ) {
    return headingTops.length - 1;
  }
  const line = metrics.scrollTop + READING_OFFSET;
  const passed = headingTops.findLastIndex((top) => top <= line);
  return Math.max(passed, 0);
}
