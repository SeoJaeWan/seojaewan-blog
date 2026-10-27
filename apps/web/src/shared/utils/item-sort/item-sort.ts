// 바탕화면과 탐색기가 항목을 늘어놓을 때 함께 쓰는 비교 규칙이다. 이름·종류·날짜를 비교한다.

import type { WorkspaceItemKind } from '@/shared/utils/workspace-rules/workspace-rules';

// 항목 유형 차례다. 휴지통, 폴더, 글, 외부 링크 차례다.
const kindOrder = { 'recycle-bin': 0, folder: 1, post: 2, link: 3 } as const satisfies Record<
  WorkspaceItemKind,
  number
>;

/**
 * 이름을 비교한다. 숫자는 값으로 비교하고(`2`가 `10`보다 앞), 영어가 한글보다 앞이다(Windows 탐색기와 같은 차례).
 * @codocs [[바탕화면:빈 곳 우클릭 메뉴]]
 * @codocs [[파일 탐색기:보기와 정렬]]
 * @param a 이름
 * @param b 이름
 * @returns 비교 값
 */
export function compareItemNames(a: string, b: string): number {
  return a.localeCompare(b, 'en', { numeric: true });
}

/**
 * 항목 유형을 휴지통, 폴더, 글, 외부 링크 차례로 비교한다.
 * @codocs [[바탕화면:빈 곳 우클릭 메뉴]]
 * @codocs [[파일 탐색기:보기와 정렬]]
 * @param a 항목 종류
 * @param b 항목 종류
 * @returns 비교 값
 */
export function compareItemKinds(a: WorkspaceItemKind, b: WorkspaceItemKind): number {
  return kindOrder[a] - kindOrder[b];
}

/**
 * 날짜를 최근 것이 앞에 오게 비교한다. 날짜가 없으면 뒤로 보낸다.
 * @codocs [[바탕화면:빈 곳 우클릭 메뉴]]
 * @param a 날짜(ISO 8601이나 YYYY-MM-DD)
 * @param b 날짜
 * @returns 비교 값
 */
export function compareDatesNewestFirst(a: string | null, b: string | null): number {
  if (a === b) {
    return 0;
  }
  if (a === null) {
    return 1;
  }
  if (b === null) {
    return -1;
  }
  return b.localeCompare(a);
}
