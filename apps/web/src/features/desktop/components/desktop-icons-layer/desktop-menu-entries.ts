import type { MenuPopupEntry } from '@/shared/components/menu-popup/menu-popup';
import type {
  DesktopIconSize,
  DesktopSortKey,
  WorkspaceItemKind,
} from '@/shared/utils/workspace-rules/workspace-rules';
import {
  DESKTOP_ICON_SIZES,
  DESKTOP_SORT_KEYS,
} from '@/shared/utils/workspace-rules/workspace-rules';

/** 빈 곳 메뉴가 보이는 설정과 동작 */
type DesktopMenuOptions = {
  /** 아이콘 크기 */
  iconSize: DesktopIconSize;
  /** 아이콘 자동 정렬 */
  isAutoArrange: boolean;
  /** 자동 정렬을 바꿀 수 없는지(모바일은 늘 자동 정렬이다) */
  isAutoArrangeLocked: boolean;
  /** 정렬 기준 */
  sortBy: DesktopSortKey;
  /** 아이콘 크기를 고르면 부른다 */
  onIconSizeChange: (iconSize: DesktopIconSize) => void;
  /** 자동 정렬을 켜거나 끄면 부른다 */
  onAutoArrangeChange: (isAutoArrange: boolean) => void;
  /** 정렬 기준을 고르면 부른다 */
  onSortByChange: (sortBy: DesktopSortKey) => void;
  /** 새로 고침 */
  onRefresh: () => void;
  /** 새로 만들기 > 폴더 */
  onNewFolder: () => void;
};

/** 아이콘 메뉴가 보이는 상태와 동작 */
type ItemMenuOptions = {
  /** 우클릭한 항목 종류. 여러 개면 null */
  kind: WorkspaceItemKind | null;
  /** Start 고정됨에 있는지(하나일 때) */
  isPinned: boolean;
  /** 휴지통으로 보낼 수 있는지(`Blog`, 휴지통은 보낼 수 없다) */
  canTrash: boolean;
  /** 열기 */
  onOpen: () => void;
  /** 새 창에서 열기 */
  onOpenInNewWindow: () => void;
  /** 링크 복사 */
  onCopyLink: () => void;
  /** 시작 화면에 고정·고정 해제 */
  onTogglePin: () => void;
  /** 이름 바꾸기 */
  onRename: () => void;
  /** 삭제(휴지통으로 보내기) */
  onTrash: () => void;
  /** 휴지통 비우기 */
  onEmptyRecycleBin: () => void;
};

// 메뉴 항목 아이콘(피그마 메뉴 조립과 같은 Fluent 아이콘)이다.
const ICONS = {
  open: 'icons/ic_fluent_open_20_regular.svg',
  window: 'icons/ic_fluent_window_20_regular.svg',
  pin: 'icons/ic_fluent_pin_20_regular.svg',
  pinOff: 'icons/ic_fluent_pin_off_20_regular.svg',
  rename: 'icons/ic_fluent_rename_20_regular.svg',
  delete: 'icons/ic_fluent_delete_20_regular.svg',
  link: 'icons/ic_fluent_link_20_regular.svg',
  refresh: 'icons/ic_fluent_arrow_clockwise_20_regular.svg',
  grid: 'icons/ic_fluent_grid_20_regular.svg',
  sort: 'icons/ic_fluent_arrow_sort_20_regular.svg',
  folderAdd: 'icons/ic_fluent_folder_add_20_regular.svg',
} as const;

const SEPARATOR = { kind: 'separator' } as const;

/**
 * 바탕화면 빈 곳 우클릭 메뉴(피그마 Menu/Desktop, 하위 메뉴 Menu/ViewSubmenu·SortSubmenu·NewSubmenu)의 항목을 만든다.
 * 모바일은 늘 자동 정렬이라 아이콘 자동 정렬 항목을 고를 수 없다.
 * @codocs [[바탕화면:빈 곳 우클릭 메뉴]]
 * @codocs [[모바일:차이]]
 * @param options 지금 설정과 동작
 * @returns 메뉴 항목
 */
export function getDesktopMenuEntries(options: DesktopMenuOptions): MenuPopupEntry[] {
  return [
    {
      kind: 'submenu',
      label: '보기',
      icon: ICONS.grid,
      entries: [
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
        SEPARATOR,
        {
          kind: 'checkbox',
          label: '아이콘 자동 정렬',
          checked: options.isAutoArrange,
          disabled: options.isAutoArrangeLocked,
          onCheckedChange: options.onAutoArrangeChange,
        },
      ],
    },
    {
      kind: 'submenu',
      label: '정렬 기준',
      icon: ICONS.sort,
      entries: [
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
      ],
    },
    { label: '새로 고침', icon: ICONS.refresh, onClick: options.onRefresh },
    SEPARATOR,
    {
      kind: 'submenu',
      label: '새로 만들기',
      icon: ICONS.folderAdd,
      entries: [{ label: '폴더', icon: ICONS.folderAdd, onClick: options.onNewFolder }],
    },
  ];
}

/**
 * 아이콘 우클릭 메뉴(피그마 Menu/Folder·Post·Link·RecycleBin·Multiple)의 항목을 만든다.
 * 이미 Start에 고정된 항목은 `시작 화면에 고정` 대신 `시작 화면에서 고정 해제`다. 휴지통으로 보낼 수 없는 항목은 삭제를 고를 수 없다.
 * @codocs [[바탕화면:아이콘 우클릭 메뉴]]
 * @param options 우클릭한 항목과 동작
 * @returns 메뉴 항목
 */
export function getItemMenuEntries(options: ItemMenuOptions): MenuPopupEntry[] {
  const open = { label: '열기', icon: ICONS.open, onClick: options.onOpen };
  const openInNewWindow = {
    label: '새 창에서 열기',
    icon: ICONS.window,
    onClick: options.onOpenInNewWindow,
  };
  const copyLink = { label: '링크 복사', icon: ICONS.link, onClick: options.onCopyLink };
  const pin = options.isPinned
    ? { label: '시작 화면에서 고정 해제', icon: ICONS.pinOff, onClick: options.onTogglePin }
    : { label: '시작 화면에 고정', icon: ICONS.pin, onClick: options.onTogglePin };
  const trash = {
    label: '삭제',
    icon: ICONS.delete,
    shortcut: 'Delete',
    disabled: !options.canTrash,
    onClick: options.onTrash,
  };
  switch (options.kind) {
    case 'folder':
      return [
        open,
        openInNewWindow,
        pin,
        SEPARATOR,
        { label: '이름 바꾸기', icon: ICONS.rename, shortcut: 'F2', onClick: options.onRename },
        trash,
      ];
    case 'post':
      return [open, openInNewWindow, copyLink, pin, SEPARATOR, trash];
    case 'link':
      return [open, copyLink, pin, SEPARATOR, trash];
    case 'recycle-bin':
      return [
        open,
        SEPARATOR,
        { label: '휴지통 비우기', icon: ICONS.delete, onClick: options.onEmptyRecycleBin },
      ];
    case null:
      return [open, SEPARATOR, trash];
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
