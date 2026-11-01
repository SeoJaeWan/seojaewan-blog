import type { ViewMenuOptions } from '@/features/file-explorer/components/explorer-body/view-submenu/view-submenu-entries';
import type { MenuPopupEntry } from '@/shared/components/menu-popup/menu-popup';
import { MENU_SEPARATOR, singleChoiceEntry } from '@/shared/utils/menu-items/menu-items';
import type { ExplorerSortKey } from '@/shared/utils/workspace-rules/workspace-rules';

// 정렬 방향 라디오의 값이다(피그마 Menu/ExplorerSortSubmenu와 같다).
const DIRECTION_VALUES = { asc: 'ascending', desc: 'descending' } as const;

/**
 * 정렬 메뉴(피그마 Menu/ExplorerSortSubmenu)의 항목을 만든다. 정렬 기준과 방향이 각각 묶음이다.
 * 명령 모음의 정렬 버튼과 빈 곳 메뉴의 정렬 기준 하위 메뉴, 메뉴 조립 스토리가 쓴다.
 * @codocs [[파일 탐색기:보기와 정렬]]
 * @codocs [[디자인 시스템:조립]]
 * @param options 지금 정렬과 동작
 * @returns 메뉴 항목
 */
export function getSortMenuEntries(options: ViewMenuOptions): MenuPopupEntry[] {
  return getSortEntries(options, [
    { value: 'name', label: '이름' },
    { value: 'modified', label: '수정한 날짜' },
    { value: 'type', label: '유형' },
  ]);
}

/**
 * 정렬 기준 묶음과 방향 묶음으로 된 정렬 메뉴 항목을 만든다. 탐색기 정렬 메뉴와 휴지통 정렬 메뉴가 쓴다.
 * @param options 지금 정렬과 동작
 * @param sortOptions 정렬 기준 선택지(차례와 글자)
 * @returns 메뉴 항목
 */
export function getSortEntries(
  options: ViewMenuOptions,
  sortOptions: readonly { value: ExplorerSortKey; label: string }[],
): MenuPopupEntry[] {
  return [
    singleChoiceEntry(options.view.sortBy, sortOptions, options.onSortByChange),
    MENU_SEPARATOR,
    singleChoiceEntry(
      DIRECTION_VALUES[options.view.sortDirection],
      [
        { value: DIRECTION_VALUES.asc, label: '오름차순' },
        { value: DIRECTION_VALUES.desc, label: '내림차순' },
      ],
      (value) => {
        options.onSortDirectionChange(value === DIRECTION_VALUES.desc ? 'desc' : 'asc');
      },
    ),
  ];
}
