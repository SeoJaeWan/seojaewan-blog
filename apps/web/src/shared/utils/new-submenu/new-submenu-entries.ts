import type { MenuPopupCommand, MenuPopupSubmenu } from '@/shared/components/menu-popup/menu-popup';
import { MENU_ICONS } from '@/shared/utils/menu-items/menu-items';

/**
 * `새로 만들기` 하위 메뉴(피그마 `Menu/NewSubmenu`, 폴더 하나)의 항목을 만든다. 바탕화면·탐색기 빈 곳 메뉴가 쓴다.
 * @param onNewFolder 폴더를 골랐을 때 할 일
 * @returns 하위 메뉴 항목
 */
export function getNewSubmenuEntries(onNewFolder: () => void): MenuPopupCommand[] {
  return [{ label: '폴더', icon: MENU_ICONS.folder, onClick: onNewFolder }];
}

/**
 * `새로 만들기` 하위 메뉴 항목을 만든다. 바탕화면·탐색기 빈 곳 메뉴가 쓴다.
 * @param onNewFolder 하위 메뉴의 폴더를 골랐을 때 할 일
 * @returns 메뉴 항목
 */
export function newSubmenuItem(onNewFolder: () => void): MenuPopupSubmenu {
  return {
    kind: 'submenu',
    label: '새로 만들기',
    icon: MENU_ICONS.addCircle,
    entries: getNewSubmenuEntries(onNewFolder),
  };
}
