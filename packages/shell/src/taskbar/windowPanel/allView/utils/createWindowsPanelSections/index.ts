import type { WindowItem, WindowsPanelAllSection } from "@window/ui";

import { getHangulInitialConsonant } from "../../../../../windows/utils/hangul";

// 모두 보기의 canonical index 순서다. host locale는 group 순서에 관여하지 않는다.
const CATEGORY_ORDER =
  "ABCDEFGHIJKLMNOPQRSTUVWXYZㄱㄲㄴㄷㄸㄹㅁㅂㅃㅅㅆㅇㅈㅉㅊㅋㅌㅍㅎ0123456789#";
const titleCollator = new Intl.Collator("ko-KR", { usage: "sort", sensitivity: "variant" });

/** 제목의 첫 글자를 canonical 모두 보기 group으로 변환하며 기타 문자와 빈 제목은 #에 묶는다. */
const createWindowsPanelInitialKey = (title: string): string => {
  const firstCharacter = title.trim()[0] ?? "";
  const hangulInitialConsonant = getHangulInitialConsonant(firstCharacter);
  if (hangulInitialConsonant !== null && CATEGORY_ORDER.includes(hangulInitialConsonant)) {
    return hangulInitialConsonant;
  }
  if (/[A-Za-z0-9]/.test(firstCharacter)) return firstCharacter.toUpperCase();
  return "#";
};

/** 현재 제목 오름차순으로 비교하고 같은 제목은 ID로 마무리해 입력 순서 의존성을 없앤다. */
const compareItems = (left: WindowItem, right: WindowItem): number =>
  titleCollator.compare(left.title, right.title) ||
  (left.id < right.id ? -1 : left.id > right.id ? 1 : 0);

/** canonical A–Z → ㄱ–ㅎ → 0–9 → # 순서와 명시적 ko-KR 제목 오름차순의 section을 만든다. */
export const createWindowsPanelSections = (
  items: readonly WindowItem[],
): WindowsPanelAllSection[] => {
  const groupedItems = new Map<string, WindowItem[]>();
  for (const item of items) {
    const category = createWindowsPanelInitialKey(item.title);
    const categoryItems = groupedItems.get(category);
    if (categoryItems) categoryItems.push(item);
    else groupedItems.set(category, [item]);
  }
  return [...groupedItems.entries()]
    .sort(([left], [right]) => CATEGORY_ORDER.indexOf(left) - CATEGORY_ORDER.indexOf(right))
    .map(([category, sectionItems]) => ({ category, items: sectionItems.sort(compareItems) }));
};
