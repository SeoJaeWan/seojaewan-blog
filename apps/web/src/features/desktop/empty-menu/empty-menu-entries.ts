import type { MenuPopupEntry } from '@/shared/components/menu-popup/menu-popup';
import {
  MENU_ICONS,
  MENU_SEPARATOR,
  pasteMenuItem,
  refreshMenuItem,
} from '@/shared/utils/menu-items/menu-items';
import { newSubmenuItem } from '@/shared/utils/new-submenu/new-submenu-entries';

import type { DesktopSortMenuOptions } from './sort-submenu/sort-submenu-entries';
import { getDesktopSortMenuEntries } from './sort-submenu/sort-submenu-entries';
import type { DesktopViewMenuOptions } from './view-submenu/view-submenu-entries';
import { getDesktopViewMenuEntries } from './view-submenu/view-submenu-entries';

/** 빈 곳 메뉴가 보이는 설정과 동작 */
type DesktopMenuOptions = DesktopViewMenuOptions &
  DesktopSortMenuOptions & {
    /** 새로 고침 */
    onRefresh: () => void;
    /** 붙여넣을 수 있는지(잘라낸 항목을 바탕화면으로 옮길 수 있는지) */
    canPaste: boolean;
    /** 붙여넣기 */
    onPaste: () => void;
    /** 새로 만들기 > 폴더 */
    onNewFolder: () => void;
  };

/**
 * 바탕화면 빈 곳 우클릭 메뉴(피그마 Menu/Desktop, 하위 메뉴 Menu/ViewSubmenu·SortSubmenu·NewSubmenu)의 항목을 만든다.
 * 실제 메뉴와 메뉴 조립 스토리가 함께 쓴다.
 * @codocs [[바탕화면 우클릭 메뉴:빈 곳]]
 * @codocs [[디자인 시스템:조립]]
 * @param options 지금 설정과 동작
 * @returns 메뉴 항목
 */
export function getDesktopMenuEntries(options: DesktopMenuOptions): MenuPopupEntry[] {
  return [
    {
      kind: 'submenu',
      label: '보기',
      icon: MENU_ICONS.grid,
      entries: getDesktopViewMenuEntries(options),
    },
    {
      kind: 'submenu',
      label: '정렬 기준',
      icon: MENU_ICONS.sort,
      entries: getDesktopSortMenuEntries(options),
    },
    refreshMenuItem(options.onRefresh),
    MENU_SEPARATOR,
    pasteMenuItem(options.canPaste, options.onPaste),
    newSubmenuItem(options.onNewFolder),
  ];
}
