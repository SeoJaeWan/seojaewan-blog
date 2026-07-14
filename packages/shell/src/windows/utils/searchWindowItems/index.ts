import type { WindowItem } from "@window/ui";

import { createHangulInitials, isHangulInitialsQuery } from "../hangul";

const normalizeSearchValue = (value: string) => value.normalize("NFC").toLowerCase();

/**
 * 전체 window 항목을 title/description 부분 문자열과 한글 초성으로 필터링한다.
 * 정렬이나 원본 변경 없이 입력 순서와 item 참조를 보존한다.
 */
export const searchWindowItems = (
  items: readonly WindowItem[],
  query: string,
): readonly WindowItem[] => {
  const normalizedQuery = normalizeSearchValue(query.trim());

  if (!normalizedQuery) {
    return items;
  }

  const shouldSearchHangulInitials = isHangulInitialsQuery(normalizedQuery);

  return items.filter((item) =>
    [item.title, item.description].some((value) => {
      if (value === undefined) {
        return false;
      }

      const normalizedValue = normalizeSearchValue(value);

      return (
        normalizedValue.includes(normalizedQuery) ||
        (shouldSearchHangulInitials &&
          createHangulInitials(normalizedValue).includes(normalizedQuery))
      );
    }),
  );
};
