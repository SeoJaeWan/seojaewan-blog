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
  ExplorerFolderView,
  ExplorerSortKey,
  ExplorerViewMode,
  SortDirection,
  WorkspaceItemKind,
} from '@/shared/utils/workspace-rules/workspace-rules';
import { EXPLORER_SORT_KEYS, EXPLORER_VIEWS } from '@/shared/utils/workspace-rules/workspace-rules';

/** 보기·정렬 메뉴가 보이는 지금 설정과 동작 */
type ViewMenuOptions = {
  /** 지금 보기와 정렬 */
  view: ExplorerFolderView;
  /** 보기를 고르면 부른다 */
  onViewChange: (view: ExplorerViewMode) => void;
  /** 정렬 기준을 고르면 부른다 */
  onSortByChange: (sortBy: ExplorerSortKey) => void;
  /** 정렬 방향을 고르면 부른다 */
  onSortDirectionChange: (direction: SortDirection) => void;
};

/** 빈 곳 메뉴가 보이는 상태와 동작 */
type EmptyMenuOptions = ViewMenuOptions & {
  /** 휴지통 보기인지. 휴지통은 정렬 기준·새로 고침·휴지통 비우기 메뉴다 */
  isRecycleBin: boolean;
  /** 붙여넣을 수 있는지 */
  canPaste: boolean;
  /** 붙여넣기 */
  onPaste: () => void;
  /** 새로 만들기 > 폴더 */
  onNewFolder: () => void;
  /** 휴지통이 비었는지. 비었으면 휴지통 비우기를 고를 수 없다 */
  isRecycleBinEmpty: boolean;
  /** 새로 고침(휴지통) */
  onRefresh: () => void;
  /** 휴지통 비우기 */
  onEmptyRecycleBin: () => void;
};

/** 항목 메뉴가 보이는 상태와 동작 */
type ItemMenuOptions = {
  /** 우클릭한 항목 종류. 여러 개면 null */
  kind: WorkspaceItemKind | null;
  /** 휴지통 안의 항목인지. 열 수 없고 복원만 된다 */
  isInRecycleBin: boolean;
  /** 모바일인지. 모바일은 탭 하나라 새 탭에서 열기가 없다 */
  isMobile: boolean;
  /** Start 고정됨에 있는지(하나일 때) */
  isPinned: boolean;
  /** 휴지통으로 보낼 수 있는지 */
  canTrash: boolean;
  /** 열기 */
  onOpen: () => void;
  /** 새 탭에서 열기 */
  onOpenInNewTab: () => void;
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
  /** 복원 */
  onRestore: () => void;
};

// 정렬 방향 라디오의 값이다(피그마 Menu/ExplorerSortSubmenu와 같다).
const DIRECTION_VALUES = { asc: 'ascending', desc: 'descending' } as const;

/**
 * 보기 메뉴(피그마 Menu/ExplorerViewSubmenu)의 항목을 만든다. 명령 모음의 보기 버튼과 빈 곳 메뉴의 보기 하위 메뉴, 메뉴 조립 스토리가 쓴다.
 * @codocs [[파일 탐색기:보기와 정렬]]
 * @codocs [[디자인 시스템:조립]]
 * @param options 지금 보기와 동작
 * @returns 메뉴 항목
 */
export function getViewMenuEntries(options: ViewMenuOptions): MenuPopupEntry[] {
  return [
    {
      kind: 'radio-group',
      value: options.view.view,
      options: [
        { value: 'large', label: '큰 아이콘' },
        { value: 'medium', label: '보통 아이콘' },
        { value: 'details', label: '자세히' },
      ],
      onValueChange: (value) => {
        if (isViewMode(value)) {
          options.onViewChange(value);
        }
      },
    },
  ];
}

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
 * 휴지통 정렬 메뉴(피그마 Menu/RecycleBinSortSubmenu)의 항목을 만든다. 휴지통은 수정한 날짜 대신 삭제한 날짜, 유형 대신 원래 위치로
 * 정렬하므로 같은 정렬 기준(`modified`, `type`)에 휴지통 열 이름을 붙이고 피그마 차례(이름·원래 위치·삭제한 날짜)로 둔다.
 * 휴지통 명령 모음의 정렬 버튼과 휴지통 빈 곳 메뉴의 정렬 기준 하위 메뉴, 메뉴 조립 스토리가 쓴다.
 * @codocs [[파일 탐색기:보기와 정렬]]
 * @codocs [[파일 탐색기:휴지통 보기]]
 * @codocs [[디자인 시스템:조립]]
 * @param options 지금 정렬과 동작
 * @returns 메뉴 항목
 */
export function getRecycleBinSortMenuEntries(options: ViewMenuOptions): MenuPopupEntry[] {
  return getSortEntries(options, [
    { value: 'name', label: '이름' },
    { value: 'type', label: '원래 위치' },
    { value: 'modified', label: '삭제한 날짜' },
  ]);
}

/**
 * 정렬 기준 묶음과 방향 묶음으로 된 정렬 메뉴 항목을 만든다.
 * @param options 지금 정렬과 동작
 * @param sortOptions 정렬 기준 선택지(차례와 글자)
 * @returns 메뉴 항목
 */
function getSortEntries(
  options: ViewMenuOptions,
  sortOptions: readonly { value: ExplorerSortKey; label: string }[],
): MenuPopupEntry[] {
  return [
    {
      kind: 'radio-group',
      value: options.view.sortBy,
      options: sortOptions,
      onValueChange: (value) => {
        if (isSortKey(value)) {
          options.onSortByChange(value);
        }
      },
    },
    MENU_SEPARATOR,
    {
      kind: 'radio-group',
      value: DIRECTION_VALUES[options.view.sortDirection],
      options: [
        { value: DIRECTION_VALUES.asc, label: '오름차순' },
        { value: DIRECTION_VALUES.desc, label: '내림차순' },
      ],
      onValueChange: (value) => {
        options.onSortDirectionChange(value === DIRECTION_VALUES.desc ? 'desc' : 'asc');
      },
    },
  ];
}

/**
 * 빈 곳 우클릭 메뉴(피그마 Menu/ExplorerEmpty)의 항목을 만든다. 보기·정렬 기준 하위 메뉴, 붙여넣기, 새로 만들기다.
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
    { kind: 'submenu', label: '보기', icon: MENU_ICONS.grid, entries: getViewMenuEntries(options) },
    {
      kind: 'submenu',
      label: '정렬 기준',
      icon: MENU_ICONS.sort,
      entries: getSortMenuEntries(options),
    },
    MENU_SEPARATOR,
    pasteMenuItem(options.canPaste, options.onPaste),
    newSubmenuItem(options.onNewFolder),
  ];
}

/**
 * 항목 우클릭 메뉴(피그마 Menu/ExplorerFolder·ExplorerPost)의 항목을 만든다. 외부 링크와 여러 개는 바탕화면 메뉴(Menu/Link·Multiple)와
 * 같고, 휴지통 안의 항목은 복원만 있다(Menu/RecycleItem). 모바일은 새 탭에서 열기가 없다.
 * 이미 Start에 고정된 항목은 `시작 화면에서 고정 해제`다. 휴지통으로 보낼 수 없는 항목은 삭제를 고를 수 없다.
 * 실제 메뉴와 메뉴 조립 스토리가 함께 쓴다.
 * @codocs [[파일 탐색기:우클릭 메뉴]]
 * @codocs [[모바일:차이]]
 * @codocs [[디자인 시스템:조립]]
 * @param options 우클릭한 항목과 동작
 * @returns 메뉴 항목
 */
export function getItemMenuEntries(options: ItemMenuOptions): MenuPopupEntry[] {
  if (options.isInRecycleBin) {
    return [{ label: '복원', icon: MENU_ICONS.restore, onClick: options.onRestore }];
  }
  const open = openMenuItem(options.onOpen);
  const openInNewTab = {
    label: '새 탭에서 열기',
    icon: MENU_ICONS.add,
    onClick: options.onOpenInNewTab,
  };
  const openInNewWindow = openInNewWindowMenuItem(options.onOpenInNewWindow);
  const copyLink = copyLinkMenuItem(options.onCopyLink);
  const pin = startPinMenuItem(options.isPinned, options.onTogglePin);
  const cut = cutMenuItem(options.onCut);
  const trash = trashMenuItem(options.canTrash, options.onTrash);
  switch (options.kind) {
    case 'folder':
      return [
        open,
        ...(options.isMobile ? [] : [openInNewTab]),
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
    case null:
      return [open, MENU_SEPARATOR, cut, trash];
  }
}

/**
 * 값이 보기인지 본다.
 * @param value 메뉴에서 고른 값
 * @returns 보기면 true
 */
function isViewMode(value: string): value is ExplorerViewMode {
  return EXPLORER_VIEWS.some((view) => view === value);
}

/**
 * 값이 정렬 기준인지 본다.
 * @param value 메뉴에서 고른 값
 * @returns 정렬 기준이면 true
 */
function isSortKey(value: string): value is ExplorerSortKey {
  return EXPLORER_SORT_KEYS.some((key) => key === value);
}
