import type { WindowItem, WindowsPanelAllSection } from "@window/ui";

import { getHangulInitialConsonant } from "../../../../../windows/utils/hangul";

const createWindowsPanelInitialKey = (title: string) => {
  const trimmedTitle = title.trim();
  if (!trimmedTitle) {
    return "";
  }

  const firstCharacter = trimmedTitle[0] ?? "";
  const hangulInitialConsonant = getHangulInitialConsonant(firstCharacter);

  if (hangulInitialConsonant !== null) {
    return hangulInitialConsonant;
  }
  if (/[A-Za-z]/.test(firstCharacter)) {
    return firstCharacter.toLowerCase();
  }
  if (/[0-9]/.test(firstCharacter)) {
    return "#";
  }

  return firstCharacter;
};

/** 전체 window 항목을 첫 글자 category section으로 변환한다. */
export const createWindowsPanelSections = (
  items: readonly WindowItem[],
): WindowsPanelAllSection[] => {
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
