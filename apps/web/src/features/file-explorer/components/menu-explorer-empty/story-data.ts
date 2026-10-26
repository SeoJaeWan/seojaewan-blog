// @codocs [[저장소 구성:앱 폴더 구조]]
// @codocs [[피그마 연동:스토리 규칙]]
// 메뉴 조립 Menu/ExplorerEmpty 스토리가 쓰는 고정 데이터다. 피그마 조립과 같은 글자·아이콘·켜짐 상태를 둔다.
import {
  MENU_EXPLORER_SORT_SUBMENU,
  MENU_EXPLORER_VIEW_SUBMENU,
} from '@/features/file-explorer/stories/explorer-submenu-data/explorer-submenu-data';
import type { MenuPopupEntry } from '@/shared/components/menu-popup/menu-popup';
import { ICON, SEPARATOR } from '@/shared/stories/menu-icons/menu-icons';

/**
 * 피그마 Menu/ExplorerEmpty: 탐색기 빈 곳 우클릭. 펼친 하위 메뉴(Submenu)에 따라 항목이 달라진다
 * @param submenu 펼친 하위 메뉴
 * @returns 메뉴 항목
 */
export function menuExplorerEmpty(submenu: 'none' | 'view' | 'sort'): readonly MenuPopupEntry[] {
  return [
    {
      kind: 'submenu',
      label: '보기',
      icon: ICON.grid,
      submenu: submenu === 'view' ? MENU_EXPLORER_VIEW_SUBMENU : undefined,
    },
    {
      kind: 'submenu',
      label: '정렬 기준',
      icon: ICON.sort,
      submenu: submenu === 'sort' ? MENU_EXPLORER_SORT_SUBMENU : undefined,
    },
    SEPARATOR,
    { label: '붙여넣기', icon: ICON.paste, shortcut: 'Ctrl+V' },
    { kind: 'submenu', label: '새로 만들기', icon: ICON.folderAdd },
  ];
}
