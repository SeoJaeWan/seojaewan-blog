import type { MenuPopupEntry } from '@/shared/components/menu-popup/menu-popup';
import {
  ctrlShiftDigitShortcut,
  getCtrlShiftDigit,
  MENU_ICONS,
  singleChoiceEntry,
} from '@/shared/utils/menu-items/menu-items';
import type {
  ExplorerFolderView,
  ExplorerSortKey,
  ExplorerViewMode,
  SortDirection,
} from '@/shared/utils/workspace-rules/workspace-rules';

/** 보기·정렬 메뉴가 보이는 지금 설정과 동작. isMobile이면 단축키 글자를 보이지 않는다. */
export type ViewMenuOptions = {
  view: ExplorerFolderView;
  isMobile: boolean;
  onViewChange: (view: ExplorerViewMode) => void;
  onSortByChange: (sortBy: ExplorerSortKey) => void;
  onSortDirectionChange: (direction: SortDirection) => void;
};

// 보기마다의 선택지와 보기 단축키(`Ctrl+Shift+숫자`)다. 메뉴 글자와 실제 단축키가 이 표 하나를 따른다.
const viewOptions = [
  { value: 'large', label: '큰 아이콘', icon: MENU_ICONS.laptop, digit: 2 },
  { value: 'medium', label: '보통 아이콘', icon: MENU_ICONS.laptopSmall, digit: 3 },
  { value: 'details', label: '자세히', icon: MENU_ICONS.details, digit: 6 },
] as const satisfies readonly {
  value: ExplorerViewMode;
  label: string;
  icon: string;
  digit: number;
}[];

/**
 * 보기 메뉴(피그마 Menu/ExplorerViewSubmenu)의 항목을 만든다. 보기마다 아이콘과 단축키 글자가 있고, 모바일은 단축키 글자를 보이지 않는다.
 * 명령 모음의 보기 버튼과 빈 곳 메뉴의 보기 하위 메뉴, 메뉴 조립 스토리가 쓴다.
 * @codocs [[파일 탐색기:보기와 정렬]]
 * @codocs [[디자인 시스템:조립]]
 * @param options 지금 보기와 동작
 * @returns 메뉴 항목
 */
export function getViewMenuEntries(options: ViewMenuOptions): MenuPopupEntry[] {
  return [
    singleChoiceEntry(
      options.view.view,
      viewOptions.map(
        /**
         * 보기 하나를 선택지로 만든다.
         * @param option 보기와 글자, 아이콘, 단축키 숫자
         * @returns 선택지
         */
        (option) => ({
          value: option.value,
          label: option.label,
          icon: option.icon,
          shortcut: ctrlShiftDigitShortcut(option.digit, options.isMobile),
        }),
      ),
      options.onViewChange,
    ),
  ];
}

/**
 * 누른 키가 탐색기 보기 단축키(`Ctrl+Shift+2·3·6`)면 그 보기를 돌려준다.
 * @codocs [[파일 탐색기:보기와 정렬]]
 * @param event 키보드 이벤트
 * @returns 보기. 보기 단축키가 아니면 undefined
 */
export function getExplorerViewForShortcut(
  event: Parameters<typeof getCtrlShiftDigit>[0],
): ExplorerViewMode | undefined {
  const digit = getCtrlShiftDigit(event);
  return viewOptions.find((option) => option.digit === digit)?.value;
}
