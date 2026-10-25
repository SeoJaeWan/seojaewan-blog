// @codocs [[저장소 구성:앱 폴더 구조]]
// @codocs [[피그마 연동:스토리 규칙]]
// 메뉴 조립(`Menu/*`) 스토리가 함께 쓰는 고정 데이터다. 피그마 조립과 같은 글자·아이콘·켜짐 상태를 둔다.
import type { MenuPopupEntry } from './menu-popup';

const ICON = {
  open: 'icons/ic_fluent_open_20_regular.svg',
  window: 'icons/ic_fluent_window_20_regular.svg',
  pin: 'icons/ic_fluent_pin_20_regular.svg',
  rename: 'icons/ic_fluent_rename_20_regular.svg',
  delete: 'icons/ic_fluent_delete_20_regular.svg',
  add: 'icons/ic_fluent_add_20_regular.svg',
  cut: 'icons/ic_fluent_cut_20_regular.svg',
  link: 'icons/ic_fluent_link_20_regular.svg',
  search: 'icons/ic_fluent_search_20_regular.svg',
  arrowRight: 'icons/ic_fluent_arrow_right_20_regular.svg',
  arrowUp: 'icons/ic_fluent_arrow_up_20_regular.svg',
  refresh: 'icons/ic_fluent_arrow_clockwise_20_regular.svg',
  restore: 'icons/ic_fluent_arrow_counterclockwise_20_regular.svg',
  grid: 'icons/ic_fluent_grid_20_regular.svg',
  sort: 'icons/ic_fluent_arrow_sort_20_regular.svg',
  folderAdd: 'icons/ic_fluent_folder_add_20_regular.svg',
  paste: 'icons/ic_fluent_clipboard_paste_20_regular.svg',
  dismiss: 'icons/ic_fluent_dismiss_20_regular.svg',
  fileExplorer: 'images/app-file-explorer.png',
} as const;

const SEPARATOR = { kind: 'separator' } as const;

/** 피그마 Menu/Folder: 바탕화면 폴더 우클릭 */
export const MENU_FOLDER = [
  { label: '열기', icon: ICON.open },
  { label: '새 창에서 열기', icon: ICON.window },
  { label: '시작 화면에 고정', icon: ICON.pin },
  SEPARATOR,
  { label: '이름 바꾸기', icon: ICON.rename, shortcut: 'F2' },
  { label: '삭제', icon: ICON.delete, shortcut: 'Delete' },
] as const;

/** 피그마 Menu/Post: 바탕화면 글 우클릭 */
export const MENU_POST = [
  { label: '열기', icon: ICON.open },
  { label: '새 창에서 열기', icon: ICON.window },
  { label: '링크 복사', icon: ICON.link },
  { label: '시작 화면에 고정', icon: ICON.pin },
  SEPARATOR,
  { label: '삭제', icon: ICON.delete, shortcut: 'Delete' },
] as const;

/** 피그마 Menu/Link: 바탕화면 외부 링크 우클릭 */
export const MENU_LINK = [
  { label: '열기', icon: ICON.open },
  { label: '링크 복사', icon: ICON.link },
  { label: '시작 화면에 고정', icon: ICON.pin },
  SEPARATOR,
  { label: '삭제', icon: ICON.delete, shortcut: 'Delete' },
] as const;

/** 피그마 Menu/RecycleBin: 바탕화면 휴지통 우클릭 */
export const MENU_RECYCLE_BIN = [
  { label: '열기', icon: ICON.open },
  SEPARATOR,
  { label: '휴지통 비우기', icon: ICON.delete },
] as const;

/** 피그마 Menu/Multiple: 바탕화면 여러 개 선택 우클릭 */
export const MENU_MULTIPLE = [
  { label: '열기', icon: ICON.open },
  SEPARATOR,
  { label: '삭제', icon: ICON.delete, shortcut: 'Delete' },
] as const;

/** 피그마 Menu/ViewSubmenu: 바탕화면 빈 곳 메뉴의 보기 하위 메뉴 */
export const MENU_VIEW_SUBMENU = [
  { kind: 'radio', label: '큰 아이콘', checked: false },
  { kind: 'radio', label: '보통 아이콘', checked: true },
  { kind: 'radio', label: '작은 아이콘', checked: false },
  SEPARATOR,
  { kind: 'checkbox', label: '아이콘 자동 정렬', checked: true },
] as const;

/** 피그마 Menu/SortSubmenu: 바탕화면 빈 곳 메뉴의 정렬 기준 하위 메뉴. 피그마는 세 항목 모두 골라진 모습이다 */
export const MENU_SORT_SUBMENU = [
  { kind: 'radio', label: '이름', checked: true },
  { kind: 'radio', label: '항목 유형', checked: true },
  { kind: 'radio', label: '수정한 날짜', checked: true },
] as const;

/** 피그마 Menu/NewSubmenu: 빈 곳 메뉴의 새로 만들기 하위 메뉴 */
export const MENU_NEW_SUBMENU = [{ label: '폴더', icon: ICON.folderAdd }] as const;

/**
 * 피그마 Menu/Desktop: 바탕화면 빈 곳 우클릭. 펼친 하위 메뉴(Submenu)에 따라 항목이 달라진다
 * @param submenu 펼친 하위 메뉴
 * @returns 메뉴 항목
 */
export function menuDesktop(submenu: 'none' | 'view' | 'sort'): readonly MenuPopupEntry[] {
  return [
    {
      kind: 'submenu',
      label: '보기',
      icon: ICON.grid,
      submenu: submenu === 'view' ? MENU_VIEW_SUBMENU : undefined,
    },
    {
      kind: 'submenu',
      label: '정렬 기준',
      icon: ICON.sort,
      submenu: submenu === 'sort' ? MENU_SORT_SUBMENU : undefined,
    },
    { label: '새로 고침', icon: ICON.refresh },
    SEPARATOR,
    { kind: 'submenu', label: '새로 만들기', icon: ICON.folderAdd },
  ];
}

/** 피그마 Menu/ExplorerFolder: 탐색기 폴더 우클릭 */
export const MENU_EXPLORER_FOLDER = [
  { label: '열기', icon: ICON.open },
  { label: '새 탭에서 열기', icon: ICON.add },
  { label: '새 창에서 열기', icon: ICON.window },
  { label: '시작 화면에 고정', icon: ICON.pin },
  SEPARATOR,
  { label: '잘라내기', icon: ICON.cut, shortcut: 'Ctrl+X' },
  { label: '이름 바꾸기', icon: ICON.rename, shortcut: 'F2' },
  { label: '삭제', icon: ICON.delete, shortcut: 'Delete' },
] as const;

/** 피그마 Menu/ExplorerPost: 탐색기 글 우클릭 */
export const MENU_EXPLORER_POST = [
  { label: '열기', icon: ICON.open },
  { label: '새 창에서 열기', icon: ICON.window },
  { label: '링크 복사', icon: ICON.link },
  { label: '시작 화면에 고정', icon: ICON.pin },
  SEPARATOR,
  { label: '잘라내기', icon: ICON.cut, shortcut: 'Ctrl+X' },
  { label: '삭제', icon: ICON.delete, shortcut: 'Delete' },
] as const;

/** 피그마 Menu/ExplorerViewSubmenu: 탐색기 빈 곳 메뉴의 보기 하위 메뉴. 피그마는 세 항목 모두 골라진 모습이다 */
export const MENU_EXPLORER_VIEW_SUBMENU = [
  { kind: 'radio', label: '큰 아이콘', checked: true },
  { kind: 'radio', label: '보통 아이콘', checked: true },
  { kind: 'radio', label: '자세히', checked: true },
] as const;

/** 피그마 Menu/ExplorerSortSubmenu: 탐색기 정렬 메뉴. 피그마는 모든 항목이 골라진 모습이다 */
export const MENU_EXPLORER_SORT_SUBMENU = [
  { kind: 'radio', label: '이름', checked: true },
  { kind: 'radio', label: '수정한 날짜', checked: true },
  { kind: 'radio', label: '유형', checked: true },
  SEPARATOR,
  { kind: 'radio', label: '오름차순', checked: true },
  { kind: 'radio', label: '내림차순', checked: true },
] as const;

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

/** 피그마 Menu/RecycleItem: 휴지통 안 항목 우클릭 */
export const MENU_RECYCLE_ITEM = [{ label: '복원', icon: ICON.restore }] as const;

/** 피그마 Menu/ChromeMore: 데스크톱 Chrome ⋮ 메뉴. 확대/축소 아이콘도 피그마처럼 돋보기다 */
export const MENU_CHROME_MORE = [
  { label: '링크 복사', icon: ICON.link },
  { label: '페이지에서 찾기', icon: ICON.search, shortcut: 'Ctrl+F' },
  { label: '확대/축소', icon: ICON.search, shortcut: '100%' },
] as const;

/** 피그마 Menu/ChromeMoreMobile: 모바일 Chrome ⋮ 메뉴 */
export const MENU_CHROME_MORE_MOBILE = [
  { label: '앞으로', icon: ICON.arrowRight },
  { label: '새로고침', icon: ICON.refresh },
  SEPARATOR,
  { label: '링크 복사', icon: ICON.link },
  { label: '페이지에서 찾기', icon: ICON.search },
  { label: '확대/축소', icon: ICON.search, shortcut: '100%' },
] as const;

/** 피그마 Menu/Power: Start 전원 메뉴 */
export const MENU_POWER = [{ label: '다시 시작', icon: ICON.refresh }] as const;

/** 피그마 Menu/StartTile: Start 고정 항목 우클릭. 고정 해제 아이콘도 피그마처럼 핀이다 */
export const MENU_START_TILE = [
  { label: '열기', icon: ICON.open },
  { label: '맨 앞으로 이동', icon: ICON.arrowUp },
  { label: '링크 복사', icon: ICON.link },
  SEPARATOR,
  { label: '시작 화면에서 고정 해제', icon: ICON.pin },
] as const;

/** 피그마 Menu/ViewOptions: Start `보기:` 전환 메뉴 */
export const MENU_VIEW_OPTIONS = [
  { kind: 'checkbox', label: '범주', checked: false },
  { kind: 'checkbox', label: '그리드', checked: true },
  { kind: 'checkbox', label: '간단히', checked: false },
] as const;

/** 피그마 Menu/TaskbarApp: 작업 표시줄 앱 버튼 우클릭 */
export const MENU_TASKBAR_APP = [
  { label: '파일 탐색기', icon: ICON.fileExplorer },
  SEPARATOR,
  { label: '작업 표시줄에서 고정 해제', icon: ICON.pin },
  { label: '창 닫기', icon: ICON.dismiss },
] as const;
