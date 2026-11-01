import type { MenuPopupEntry } from '@/shared/components/menu-popup/menu-popup';
import { singleChoiceEntry } from '@/shared/utils/menu-items/menu-items';
import type { DesktopSortKey } from '@/shared/utils/workspace-rules/workspace-rules';

/** 정렬 기준 하위 메뉴가 보이는 설정과 동작 */
export type DesktopSortMenuOptions = {
  /** 정렬 기준 */
  sortBy: DesktopSortKey;
  /** 정렬 기준을 고르면 부른다 */
  onSortByChange: (sortBy: DesktopSortKey) => void;
};

/**
 * 바탕화면 빈 곳 메뉴의 정렬 기준 하위 메뉴(피그마 Menu/SortSubmenu) 항목을 만든다. 하나를 고르는 선택지다.
 * @codocs [[바탕화면 우클릭 메뉴:빈 곳]]
 * @param options 지금 정렬 기준과 동작
 * @returns 메뉴 항목
 */
export function getDesktopSortMenuEntries(options: DesktopSortMenuOptions): MenuPopupEntry[] {
  return [
    singleChoiceEntry(
      options.sortBy,
      [
        { value: 'name', label: '이름' },
        { value: 'type', label: '항목 유형' },
        { value: 'modified', label: '수정한 날짜' },
      ],
      options.onSortByChange,
    ),
  ];
}
