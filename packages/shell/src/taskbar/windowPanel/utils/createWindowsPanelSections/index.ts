import type { WindowItem, WindowsPanelSection } from "@window/ui";

const CHOSEONG = [
  "ㄱ",
  "ㄲ",
  "ㄴ",
  "ㄷ",
  "ㄸ",
  "ㄹ",
  "ㅁ",
  "ㅂ",
  "ㅃ",
  "ㅅ",
  "ㅆ",
  "ㅇ",
  "ㅈ",
  "ㅉ",
  "ㅊ",
  "ㅋ",
  "ㅌ",
  "ㅍ",
  "ㅎ",
] as const;

const HANGUL_START = 0xac00;
const HANGUL_END = 0xd7a3;
const HANGUL_SYLLABLE_STEP = 21 * 28;

const createWindowsPanelInitialKey = (title: string) => {
  const trimmedTitle = title.trim();
  if (!trimmedTitle) {
    return "";
  }

  const codePoint = trimmedTitle.codePointAt(0) ?? 0;
  if (codePoint >= HANGUL_START && codePoint <= HANGUL_END) {
    return CHOSEONG[Math.floor((codePoint - HANGUL_START) / HANGUL_SYLLABLE_STEP)];
  }

  const firstCharacter = trimmedTitle[0] ?? "";
  if (codePoint >= 0x3131 && codePoint <= 0x314e) {
    return firstCharacter;
  }
  if (/[A-Za-z]/.test(firstCharacter)) {
    return firstCharacter.toLowerCase();
  }
  if (/[0-9]/.test(firstCharacter)) {
    return "#";
  }

  return firstCharacter;
};

/**
 * 전체 window 항목을 원본 시작 panel의 첫 글자 category section으로 변환한다.
 * category만 localeCompare 순서로 정렬하고 같은 category의 항목 입력 순서와 참조는 보존한다.
 *
 * @param items 시작 panel의 모두 보기에 표시할 전체 항목
 * @returns category와 해당 category의 항목을 묶은 section 목록
 */
export const createWindowsPanelSections = (
  items: readonly WindowItem[],
): WindowsPanelSection[] => {
  const groupedItems = new Map<string, WindowItem[]>();

  for (const item of items) {
    const category = createWindowsPanelInitialKey(item.title).toUpperCase();
    const categoryItems = groupedItems.get(category);

    if (categoryItems) {
      categoryItems.push(item);
    } else {
      groupedItems.set(category, [item]);
    }
  }

  return [...groupedItems.entries()]
    .sort(([categoryA], [categoryB]) => categoryA.localeCompare(categoryB))
    .map(([category, sectionItems]) => ({ category, items: sectionItems }));
};
