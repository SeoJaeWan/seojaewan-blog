import { getRecycleBinSortMenuEntries } from '@/features/file-explorer/components/explorer-body/recycle-bin-sort-submenu/recycle-bin-sort-submenu-entries';
import { getSortMenuEntries } from '@/features/file-explorer/components/explorer-body/sort-submenu/sort-submenu-entries';
import type { ViewMenuOptions } from '@/features/file-explorer/components/explorer-body/view-submenu/view-submenu-entries';
import { getViewMenuEntries } from '@/features/file-explorer/components/explorer-body/view-submenu/view-submenu-entries';
import type { MenuPopupEntry } from '@/shared/components/menu-popup/menu-popup';
import {
  emptyRecycleBinMenuItem,
  MENU_ICONS,
  MENU_SEPARATOR,
  menuCommandBar,
  pasteCommandButtons,
  refreshMenuItem,
} from '@/shared/utils/menu-items/menu-items';
import { newSubmenuItem } from '@/shared/utils/new-submenu/new-submenu-entries';

/** 빈 곳 메뉴가 보이는 상태와 동작. isRecycleBin이면 휴지통 보기이며 정렬 기준·새로 고침·휴지통 비우기 메뉴다. isRecycleBinEmpty가 true면 휴지통 비우기를 고를 수 없다. */
type EmptyMenuOptions = ViewMenuOptions & {
  isRecycleBin: boolean;
  canPaste: boolean;
  onPaste: () => void;
  onNewFolder: () => void;
  isRecycleBinEmpty: boolean;
  onRefresh: () => void;
  onEmptyRecycleBin: () => void;
};

/**
 * 빈 곳 우클릭 메뉴(피그마 Menu/ExplorerEmpty)의 항목을 만든다. 보기·정렬 기준 하위 메뉴, 새로 만들기이고, 붙여넣을 수 있을 때만
 * 단추 줄에 붙여넣기 단추 하나를 둔다(없으면 단추 줄이 없다, [[항목 조작:잘라내기와 붙여넣기]]).
 * 휴지통의 빈 곳(피그마 Menu/RecycleBinEmpty)은 휴지통 정렬 기준 하위 메뉴, 새로 고침, 휴지통 비우기다. 휴지통이 비었으면 휴지통 비우기를
 * 고를 수 없다. 실제 메뉴와 메뉴 조립 스토리가 함께 쓴다.
 * @codocs [[파일 탐색기:우클릭 메뉴]]
 * @codocs [[파일 탐색기:구성]]
 * @codocs [[디자인 시스템:조립]]
 * @param options 지금 설정과 동작
 * @returns 메뉴 항목
 */
export function getEmptyMenuEntries(options: EmptyMenuOptions): MenuPopupEntry[] {
  if (options.isRecycleBin) {
    return [
      {
        kind: 'submenu',
        label: '정렬 기준',
        icon: MENU_ICONS.sort,
        entries: getRecycleBinSortMenuEntries(options),
      },
      refreshMenuItem(options.onRefresh),
      MENU_SEPARATOR,
      emptyRecycleBinMenuItem(options.isRecycleBinEmpty, options.onEmptyRecycleBin),
    ];
  }
  return [
    ...menuCommandBar(pasteCommandButtons(options.canPaste, options.onPaste)),
    { kind: 'submenu', label: '보기', icon: MENU_ICONS.grid, entries: getViewMenuEntries(options) },
    {
      kind: 'submenu',
      label: '정렬 기준',
      icon: MENU_ICONS.sort,
      entries: getSortMenuEntries(options),
    },
    MENU_SEPARATOR,
    newSubmenuItem(options.onNewFolder),
  ];
}
