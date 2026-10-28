import type { MenuPopupEntry } from '@/shared/components/menu-popup/menu-popup';
import {
  copyLinkMenuItem,
  cutMenuItem,
  emptyRecycleBinMenuItem,
  MENU_ICONS,
  MENU_SEPARATOR,
  newSubmenuItem,
  openInNewWindowMenuItem,
  openMenuItem,
  pasteMenuItem,
  refreshMenuItem,
  renameMenuItem,
  startPinMenuItem,
  trashMenuItem,
} from '@/shared/utils/menu-items/menu-items';
import type {
  DesktopIconSize,
  DesktopSortKey,
  WorkspaceItemKind,
} from '@/shared/utils/workspace-rules/workspace-rules';
import {
  DESKTOP_ICON_SIZES,
  DESKTOP_SORT_KEYS,
} from '@/shared/utils/workspace-rules/workspace-rules';

/** 보기 하위 메뉴가 보이는 설정과 동작 */
type DesktopViewMenuOptions = {
  /** 아이콘 크기 */
  iconSize: DesktopIconSize;
  /** 아이콘 자동 정렬 */
  isAutoArrange: boolean;
  /** 자동 정렬을 바꿀 수 없는지(모바일은 늘 자동 정렬이다) */
  isAutoArrangeLocked: boolean;
  /** 아이콘 크기를 고르면 부른다 */
  onIconSizeChange: (iconSize: DesktopIconSize) => void;
  /** 자동 정렬을 켜거나 끄면 부른다 */
  onAutoArrangeChange: (isAutoArrange: boolean) => void;
};

/** 정렬 기준 하위 메뉴가 보이는 설정과 동작 */
type DesktopSortMenuOptions = {
  /** 정렬 기준 */
  sortBy: DesktopSortKey;
  /** 정렬 기준을 고르면 부른다 */
  onSortByChange: (sortBy: DesktopSortKey) => void;
};

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

/** 아이콘 메뉴가 보이는 상태와 동작 */
type ItemMenuOptions = {
  /** 우클릭한 항목 종류. 여러 개면 null */
  kind: WorkspaceItemKind | null;
  /** Start 고정됨에 있는지(하나일 때) */
  isPinned: boolean;
  /** 휴지통으로 보낼 수 있는지(휴지통은 보낼 수 없다) */
  canTrash: boolean;
  /** 열기 */
  onOpen: () => void;
  /** 새 창에서 열기 */
  onOpenInNewWindow: () => void;
  /** 링크 복사 */
  onCopyLink: () => void;
  /** 시작 화면에 고정·고정 해제 */
  onTogglePin: () => void;
  /** 잘라내기 */
  onCut: () => void;
  /** 이름 바꾸기 */
  onRename: () => void;
  /** 삭제(휴지통으로 보내기) */
  onTrash: () => void;
  /** 휴지통 비우기 */
  onEmptyRecycleBin: () => void;
};

/**
 * 바탕화면 빈 곳 우클릭 메뉴(피그마 Menu/Desktop, 하위 메뉴 Menu/ViewSubmenu·SortSubmenu·NewSubmenu)의 항목을 만든다.
 * 실제 메뉴와 메뉴 조립 스토리가 함께 쓴다.
 * @codocs [[바탕화면:빈 곳 우클릭 메뉴]]
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

/**
 * 바탕화면 빈 곳 메뉴의 보기 하위 메뉴(피그마 Menu/ViewSubmenu) 항목을 만든다.
 * 모바일은 늘 자동 정렬이라 아이콘 자동 정렬 항목을 고를 수 없다.
 * @codocs [[바탕화면:빈 곳 우클릭 메뉴]]
 * @codocs [[모바일:차이]]
 * @param options 지금 설정과 동작
 * @returns 메뉴 항목
 */
export function getDesktopViewMenuEntries(options: DesktopViewMenuOptions): MenuPopupEntry[] {
  return [
    {
      kind: 'radio-group',
      value: options.iconSize,
      options: [
        { value: 'large', label: '큰 아이콘' },
        { value: 'medium', label: '보통 아이콘' },
        { value: 'small', label: '작은 아이콘' },
      ],
      onValueChange: (value) => {
        if (isIconSize(value)) {
          options.onIconSizeChange(value);
        }
      },
    },
    MENU_SEPARATOR,
    {
      kind: 'checkbox',
      label: '아이콘 자동 정렬',
      checked: options.isAutoArrange,
      disabled: options.isAutoArrangeLocked,
      onCheckedChange: options.onAutoArrangeChange,
    },
  ];
}

/**
 * 바탕화면 빈 곳 메뉴의 정렬 기준 하위 메뉴(피그마 Menu/SortSubmenu) 항목을 만든다. 하나를 고르는 선택지다.
 * @codocs [[바탕화면:빈 곳 우클릭 메뉴]]
 * @param options 지금 정렬 기준과 동작
 * @returns 메뉴 항목
 */
export function getDesktopSortMenuEntries(options: DesktopSortMenuOptions): MenuPopupEntry[] {
  return [
    {
      kind: 'radio-group',
      value: options.sortBy,
      options: [
        { value: 'name', label: '이름' },
        { value: 'type', label: '항목 유형' },
        { value: 'modified', label: '수정한 날짜' },
      ],
      onValueChange: (value) => {
        if (isSortKey(value)) {
          options.onSortByChange(value);
        }
      },
    },
  ];
}

/**
 * 아이콘 우클릭 메뉴(피그마 Menu/Folder·Post·Link·RecycleBin·Multiple)의 항목을 만든다. 실제 메뉴와 메뉴 조립 스토리가 함께 쓴다.
 * 이미 Start에 고정된 항목은 `시작 화면에 고정` 대신 `시작 화면에서 고정 해제`다. 휴지통으로 보낼 수 없는 항목은 삭제를 고를 수 없다.
 * @codocs [[바탕화면:아이콘 우클릭 메뉴]]
 * @codocs [[디자인 시스템:조립]]
 * @param options 우클릭한 항목과 동작
 * @returns 메뉴 항목
 */
export function getItemMenuEntries(options: ItemMenuOptions): MenuPopupEntry[] {
  const open = openMenuItem(options.onOpen);
  const openInNewWindow = openInNewWindowMenuItem(options.onOpenInNewWindow);
  const copyLink = copyLinkMenuItem(options.onCopyLink);
  const pin = startPinMenuItem(options.isPinned, options.onTogglePin);
  const cut = cutMenuItem(options.onCut);
  const trash = trashMenuItem(options.canTrash, options.onTrash);
  switch (options.kind) {
    case 'folder':
      return [
        open,
        openInNewWindow,
        pin,
        MENU_SEPARATOR,
        cut,
        renameMenuItem(options.onRename),
        trash,
      ];
    case 'post':
      return [open, openInNewWindow, copyLink, pin, MENU_SEPARATOR, cut, trash];
    case 'link':
      return [open, copyLink, pin, MENU_SEPARATOR, cut, trash];
    case 'recycle-bin':
      return [open, MENU_SEPARATOR, emptyRecycleBinMenuItem(false, options.onEmptyRecycleBin)];
    case null:
      return [open, MENU_SEPARATOR, cut, trash];
  }
}

/**
 * 값이 아이콘 크기인지 본다.
 * @param value 메뉴에서 고른 값
 * @returns 아이콘 크기면 true
 */
function isIconSize(value: string): value is DesktopIconSize {
  return DESKTOP_ICON_SIZES.some((size) => size === value);
}

/**
 * 값이 정렬 기준인지 본다.
 * @param value 메뉴에서 고른 값
 * @returns 정렬 기준이면 true
 */
function isSortKey(value: string): value is DesktopSortKey {
  return DESKTOP_SORT_KEYS.some((key) => key === value);
}
