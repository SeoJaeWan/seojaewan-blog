import type {
  MenuPopupCommand,
  MenuPopupCommandBar,
  MenuPopupCommandButton,
  MenuPopupRadioGroup,
  MenuPopupRadioOption,
} from '@/shared/components/menu-popup/menu-popup';

// 메뉴 항목 아이콘(피그마 메뉴 조립 `Menu/*`과 같은 Fluent 아이콘)이다.
export const MENU_ICONS = {
  open: 'icons/ic_fluent_open_20_regular.svg',
  window: 'icons/ic_fluent_window_20_regular.svg',
  pin: 'icons/ic_fluent_pin_20_regular.svg',
  pinOff: 'icons/ic_fluent_pin_off_20_regular.svg',
  rename: 'icons/ic_fluent_rename_20_regular.svg',
  delete: 'icons/ic_fluent_delete_20_regular.svg',
  add: 'icons/ic_fluent_add_20_regular.svg',
  cut: 'icons/ic_fluent_cut_20_regular.svg',
  link: 'icons/ic_fluent_link_20_regular.svg',
  search: 'icons/ic_fluent_search_20_regular.svg',
  arrowLeft: 'icons/ic_fluent_arrow_left_20_regular.svg',
  arrowRight: 'icons/ic_fluent_arrow_right_20_regular.svg',
  arrowUpLeft: 'icons/ic_fluent_arrow_up_left_20_regular.svg',
  refresh: 'icons/ic_fluent_arrow_clockwise_20_regular.svg',
  restore: 'icons/ic_fluent_arrow_counterclockwise_20_regular.svg',
  grid: 'icons/ic_fluent_grid_20_regular.svg',
  laptop: 'icons/ic_fluent_laptop_20_regular.svg',
  laptopSmall: 'icons/ic_fluent_laptop_16_regular.svg',
  details: 'icons/ic_fluent_line_horizontal_4_20_regular.svg',
  autoArrange: 'illustrations/icon-color-auto-arrange.svg',
  sort: 'icons/ic_fluent_arrow_sort_20_regular.svg',
  addCircle: 'icons/ic_fluent_add_circle_20_regular.svg',
  folder: 'images/file-folder',
  paste: 'icons/ic_fluent_clipboard_paste_20_regular.svg',
  dismiss: 'icons/ic_fluent_dismiss_20_regular.svg',
} as const;

// 항목 사이 구분선이다.
export const MENU_SEPARATOR = { kind: 'separator' } as const;

/** 단축키를 누른 키보드 이벤트에서 보는 값 */
type ShortcutKeyEvent = Pick<KeyboardEvent, 'ctrlKey' | 'metaKey' | 'shiftKey' | 'altKey' | 'code'>;

/**
 * 보기를 바꾸는 `Ctrl+Shift+숫자` 단축키의 메뉴 글자를 만든다. 모바일 메뉴는 단축키 글자를 보이지 않는다(Chrome ⋮ 메뉴와 같다).
 * @param digit 숫자 키
 * @param isMobile 모바일인지
 * @returns 메뉴 오른쪽에 보일 단축키 글자. 모바일이면 없다
 */
export function ctrlShiftDigitShortcut(digit: number, isMobile: boolean): string | undefined {
  return isMobile ? undefined : `Ctrl+Shift+${String(digit)}`;
}

/**
 * 누른 키가 `Ctrl+Shift+숫자`(맥은 Cmd)면 그 숫자를 돌려준다. Shift를 누르면 `key`가 기호로 바뀌므로 자판 자리(`code`)로 본다.
 * @param event 키보드 이벤트
 * @returns 숫자. 아니면 undefined
 */
export function getCtrlShiftDigit(event: ShortcutKeyEvent): number | undefined {
  const match = /^Digit(\d)$/u.exec(event.code);
  if (match === null || !(event.ctrlKey || event.metaKey) || !event.shiftKey || event.altKey) {
    return undefined;
  }
  return Number(match[1]);
}

/**
 * `열기` 항목을 만든다. 바탕화면·탐색기·Start 메뉴가 쓴다.
 * @param onClick 골랐을 때 할 일
 * @returns 메뉴 항목
 */
export function openMenuItem(onClick: () => void): MenuPopupCommand {
  return { label: '열기', icon: MENU_ICONS.open, onClick };
}

/**
 * 바탕화면·탐색기 항목 메뉴의 `열기` 항목을 만든다. 항목을 고른 채 Enter를 누르면 열리므로 오른쪽에 `Enter`를 보인다(Windows 11 파일 메뉴와 같다). 모바일 메뉴는 단축키 글자를 보이지 않는다(`ctrlShiftDigitShortcut`과 같다).
 * @codocs [[바탕화면 우클릭 메뉴:아이콘]]
 * @codocs [[반응형:입력 차이]]
 * @param onClick 골랐을 때 할 일
 * @param isMobile 모바일인지
 * @returns 메뉴 항목. 모바일이면 단축키 글자가 없다
 */
export function openItemMenuItem(onClick: () => void, isMobile: boolean): MenuPopupCommand {
  const item = openMenuItem(onClick);
  return isMobile ? item : { ...item, shortcut: 'Enter' };
}

/**
 * `새 창에서 열기` 항목을 만든다. 바탕화면·탐색기 메뉴가 쓴다.
 * @param onClick 골랐을 때 할 일
 * @returns 메뉴 항목
 */
export function openInNewWindowMenuItem(onClick: () => void): MenuPopupCommand {
  return { label: '새 창에서 열기', icon: MENU_ICONS.window, onClick };
}

/**
 * `링크 복사` 항목을 만든다. 바탕화면·탐색기·Start·Chrome 메뉴가 쓴다.
 * @param onClick 골랐을 때 할 일
 * @param isDisabled 고를 수 없게 할지
 * @returns 메뉴 항목
 */
export function copyLinkMenuItem(onClick: () => void, isDisabled = false): MenuPopupCommand {
  return {
    label: '링크 복사',
    icon: MENU_ICONS.link,
    isDisabled: isDisabled,
    onClick,
  };
}

/**
 * Start 고정됨에 넣거나 빼는 항목을 만든다. 이미 고정된 항목은 `시작 화면에 고정` 대신 `시작 화면에서 고정 해제`다.
 * 바탕화면·탐색기·Start 메뉴가 쓴다.
 * @codocs [[바탕화면 우클릭 메뉴:아이콘]]
 * @codocs [[고정:시작 화면 고정]]
 * @param isPinned 이미 Start에 고정됐는지
 * @param onClick 골랐을 때 할 일
 * @returns 메뉴 항목
 */
export function startPinMenuItem(isPinned: boolean, onClick: () => void): MenuPopupCommand {
  return isPinned
    ? { label: '시작 화면에서 고정 해제', icon: MENU_ICONS.pinOff, onClick }
    : { label: '시작 화면에 고정', icon: MENU_ICONS.pin, onClick };
}

/**
 * 폴더를 탐색기 즐겨찾기에 고정하거나 빼는 항목을 만든다. 탐색기·바탕화면 폴더 메뉴가 쓴다.
 * @codocs [[파일 탐색기:우클릭 메뉴]]
 * @codocs [[고정:즐겨찾기 고정]]
 * @param isFavorite 이미 즐겨찾기에 있는지
 * @param onClick 골랐을 때 할 일
 * @returns 메뉴 항목
 */
export function favoritePinMenuItem(isFavorite: boolean, onClick: () => void): MenuPopupCommand {
  return isFavorite
    ? { label: '즐겨찾기에서 제거', icon: MENU_ICONS.pinOff, onClick }
    : { label: '즐겨찾기에 고정', icon: MENU_ICONS.pin, onClick };
}

/**
 * 작업 표시줄에 앱을 고정하거나 고정을 푸는 항목을 만든다. 둘 다 고정 아이콘이다(피그마 `Menu/TaskbarApp`).
 * 작업 표시줄 앱 메뉴와 Start 모두 목록 메뉴가 쓴다.
 * @codocs [[작업 표시줄:우클릭 메뉴]]
 * @codocs [[Start 메뉴:모두]]
 * @param isPinned 이미 작업 표시줄에 고정됐는지
 * @param onClick 골랐을 때 할 일
 * @returns 메뉴 항목
 */
export function taskbarPinMenuItem(isPinned: boolean, onClick: () => void): MenuPopupCommand {
  return {
    label: isPinned ? '작업 표시줄에서 제거' : '작업 표시줄에 고정',
    icon: isPinned ? MENU_ICONS.pinOff : MENU_ICONS.pin,
    onClick,
  };
}

/**
 * 단추 줄(피그마 MenuCommandBar)을 만든다. 단추가 없으면 단추 줄도 없어(빈 목록) 메뉴 항목에 펼쳐 넣는다.
 * 바탕화면·탐색기의 항목 메뉴와 빈 곳 메뉴가 쓴다. 놓는 자리(맨 위·맨 아래)는 메뉴가 열린 쪽으로 MenuPopup이 정한다.
 * @codocs [[바탕화면 우클릭 메뉴:아이콘]]
 * @param buttons 단추. 왼쪽부터
 * @returns 단추 줄 하나, 단추가 없으면 빈 목록
 */
export function menuCommandBar(buttons: readonly MenuPopupCommandButton[]): MenuPopupCommandBar[] {
  return buttons.length === 0 ? [] : [{ kind: 'command-bar', buttons }];
}

/**
 * 단추 줄의 `잘라내기` 단추를 만든다. 바탕화면·탐색기 메뉴가 쓴다.
 * @param onClick 골랐을 때 할 일
 * @returns 단추
 */
export function cutCommandButton(onClick: () => void): MenuPopupCommandButton {
  return { label: '잘라내기', icon: MENU_ICONS.cut, shortcut: 'Ctrl+X', onClick };
}

/**
 * 단추 줄의 `이름 바꾸기` 단추를 만든다. 바탕화면·탐색기 메뉴가 쓴다.
 * @param onClick 골랐을 때 할 일
 * @returns 단추
 */
export function renameCommandButton(onClick: () => void): MenuPopupCommandButton {
  return { label: '이름 바꾸기', icon: MENU_ICONS.rename, shortcut: 'F2', onClick };
}

/**
 * 단추 줄의 `삭제`(휴지통으로 보내기) 단추를 만든다. 단추는 비활성 모양이 없어, 휴지통으로 보낼 수 없으면 단추를 두지 않는다(빈 목록).
 * 바탕화면·탐색기 메뉴가 쓴다.
 * @param canTrash 휴지통으로 보낼 수 있는지
 * @param onClick 골랐을 때 할 일
 * @returns 단추 하나, 보낼 수 없으면 빈 목록
 */
export function trashCommandButtons(
  canTrash: boolean,
  onClick: () => void,
): MenuPopupCommandButton[] {
  return canTrash ? [{ label: '삭제', icon: MENU_ICONS.delete, shortcut: 'Delete', onClick }] : [];
}

/**
 * `새로 고침` 항목을 만든다. 바탕화면 빈 곳과 탐색기 휴지통 빈 곳 메뉴가 쓴다.
 * @param onClick 골랐을 때 할 일
 * @returns 메뉴 항목
 */
export function refreshMenuItem(onClick: () => void): MenuPopupCommand {
  return { label: '새로 고침', icon: MENU_ICONS.refresh, onClick };
}

/**
 * 빈 곳 메뉴의 단추 줄 `붙여넣기` 단추를 만든다. 붙여넣을 수 없으면 단추를 두지 않아(빈 목록) 단추 줄도 없다.
 * 바탕화면·탐색기 빈 곳 메뉴가 쓴다.
 * @codocs [[항목 조작:잘라내기와 붙여넣기]]
 * @param canPaste 붙여넣을 수 있는지
 * @param onClick 골랐을 때 할 일
 * @returns 단추 하나, 붙여넣을 수 없으면 빈 목록
 */
export function pasteCommandButtons(
  canPaste: boolean,
  onClick: () => void,
): MenuPopupCommandButton[] {
  return canPaste
    ? [{ label: '붙여넣기', icon: MENU_ICONS.paste, shortcut: 'Ctrl+V', onClick }]
    : [];
}

/**
 * `휴지통 비우기` 항목을 만든다. 휴지통이 비었으면 고를 수 없다. 바탕화면 휴지통 아이콘 메뉴와 탐색기 휴지통 빈 곳 메뉴가 쓴다.
 * @codocs [[파일 탐색기:구성]]
 * @codocs [[바탕화면 우클릭 메뉴:아이콘]]
 * @param isRecycleBinEmpty 휴지통이 비었는지
 * @param onClick 골랐을 때 할 일
 * @returns 메뉴 항목
 */
export function emptyRecycleBinMenuItem(
  isRecycleBinEmpty: boolean,
  onClick: () => void,
): MenuPopupCommand {
  return {
    label: '휴지통 비우기',
    icon: MENU_ICONS.delete,
    isDisabled: isRecycleBinEmpty,
    onClick,
  };
}

/**
 * 여럿 중 하나를 고르는 묶음(피그마 메뉴의 라디오 항목)을 만든다. 바탕화면·탐색기의 보기·정렬 메뉴가 쓴다.
 * 메뉴는 고른 값을 글자로 넘기므로 선택지에 있는 값인지 보고 맞을 때만 알린다.
 * @param value 지금 고른 값
 * @param options 선택지(차례와 글자, 아이콘, 단축키 글자)
 * @param onChange 다른 값을 고르면 부른다
 * @returns 메뉴 항목
 */
export function singleChoiceEntry<Value extends string>(
  value: Value,
  options: readonly (MenuPopupRadioOption & { value: Value })[],
  onChange: (value: Value) => void,
): MenuPopupRadioGroup {
  return {
    kind: 'radio-group',
    value,
    options,
    onValueChange: (next) => {
      const chosen = options.find((option) => option.value === next);
      if (chosen !== undefined) {
        onChange(chosen.value);
      }
    },
  };
}
