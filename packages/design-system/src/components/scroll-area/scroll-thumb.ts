/** 스크롤바 막대의 위치와 길이(px). 내용이 넘치지 않으면 없다 */
export type Thumb = { offset: number; length: number };

// 막대가 움직이는 길이는 스크롤바 길이에서 양 끝의 안쪽 여백(spacing/2)과 화살표(size/8), 합 10을 뺀 것이다.
// 화살표는 펼쳤을 때만 그리지만, 펼칠 때 막대가 움직이지 않도록 접혔을 때도 같은 길이를 쓴다.
const TRACK_INSET = 10;

/**
 * 스크롤 위치와 영역 크기로 스크롤바 막대의 위치와 길이를 구한다.
 * 막대 길이는 보이는 비율, 위치는 스크롤한 비율을 막대가 움직이는 길이에 옮긴 것이다.
 * @codocs [[디자인 기반:겹쳐 놓기]]
 * @param viewport 스크롤하는 요소
 * @param scrollbarLength 스크롤바 길이
 * @returns 막대의 위치와 길이. 내용이 넘치지 않으면 undefined
 */
export function scrollThumb(
  viewport: Pick<HTMLElement, 'clientHeight' | 'scrollHeight' | 'scrollTop'>,
  scrollbarLength: number,
): Thumb | undefined {
  const { clientHeight, scrollHeight, scrollTop } = viewport;
  const scrollRange = scrollHeight - clientHeight;
  if (scrollRange <= 0) return undefined;
  const track = Math.max(scrollbarLength - TRACK_INSET * 2, 0);
  const length = (track * clientHeight) / scrollHeight;
  const offset = TRACK_INSET + ((track - length) * scrollTop) / scrollRange;
  return { offset, length };
}
