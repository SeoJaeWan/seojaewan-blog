import type { MenuPopupEntry } from '@/shared/components/menu-popup/menu-popup';
import {
  ctrlShiftDigitShortcut,
  getCtrlShiftDigit,
  MENU_ICONS,
  MENU_SEPARATOR,
  singleChoiceEntry,
} from '@/shared/utils/menu-items/menu-items';
import type { DesktopIconSize } from '@/shared/utils/workspace-rules/workspace-rules';

/**
 * 보기 하위 메뉴가 보이는 설정과 동작. isAutoArrangeLocked는 자동 정렬을 바꿀 수 없는지(모바일은 늘 자동 정렬이다)이고,
 * isMobile이면 단축키 글자를 보이지 않는다.
 */
export type DesktopViewMenuOptions = {
  iconSize: DesktopIconSize;
  isAutoArrange: boolean;
  isAutoArrangeLocked: boolean;
  isMobile: boolean;
  onIconSizeChange: (iconSize: DesktopIconSize) => void;
  onAutoArrangeChange: (isAutoArrange: boolean) => void;
};

// 아이콘 크기마다의 선택지와 보기 단축키(`Ctrl+Shift+숫자`)다. 메뉴 글자와 실제 단축키가 이 표 하나를 따른다.
const iconSizeOptions = [
  { value: 'large', label: '큰 아이콘', icon: MENU_ICONS.laptop, digit: 2 },
  { value: 'medium', label: '보통 아이콘', icon: MENU_ICONS.laptopSmall, digit: 3 },
  { value: 'small', label: '작은 아이콘', icon: MENU_ICONS.grid, digit: 4 },
] as const satisfies readonly {
  value: DesktopIconSize;
  label: string;
  icon: string;
  digit: number;
}[];

/**
 * 바탕화면 빈 곳 메뉴의 보기 하위 메뉴(피그마 Menu/ViewSubmenu) 항목을 만든다. 아이콘 크기마다 아이콘과 단축키 글자가 있다.
 * 모바일은 늘 자동 정렬이라 아이콘 자동 정렬 항목을 고를 수 없고, 단축키 글자를 보이지 않는다.
 * @codocs [[바탕화면 우클릭 메뉴:빈 곳]]
 * @codocs [[바탕화면 아이콘:모바일]]
 * @codocs [[항목 조작:단축키]]
 * @param options 지금 설정과 동작
 * @returns 메뉴 항목
 */
export function getDesktopViewMenuEntries(options: DesktopViewMenuOptions): MenuPopupEntry[] {
  return [
    singleChoiceEntry(
      options.iconSize,
      iconSizeOptions.map(
        /**
         * 아이콘 크기 하나를 선택지로 만든다.
         * @param option 아이콘 크기와 글자, 아이콘, 단축키 숫자
         * @returns 선택지
         */
        (option) => ({
          value: option.value,
          label: option.label,
          icon: option.icon,
          shortcut: ctrlShiftDigitShortcut(option.digit, options.isMobile),
        }),
      ),
      options.onIconSizeChange,
    ),
    MENU_SEPARATOR,
    {
      kind: 'checkbox',
      label: '아이콘 자동 정렬',
      icon: MENU_ICONS.autoArrange,
      isChecked: options.isAutoArrange,
      isDisabled: options.isAutoArrangeLocked,
      onCheckedChange: options.onAutoArrangeChange,
    },
  ];
}

/**
 * 누른 키가 바탕화면 보기 단축키(`Ctrl+Shift+2·3·4`)면 그 아이콘 크기를 돌려준다.
 * @codocs [[항목 조작:단축키]]
 * @param event 키보드 이벤트
 * @returns 아이콘 크기. 보기 단축키가 아니면 undefined
 */
export function getDesktopIconSizeForShortcut(
  event: Parameters<typeof getCtrlShiftDigit>[0],
): DesktopIconSize | undefined {
  const digit = getCtrlShiftDigit(event);
  return iconSizeOptions.find((option) => option.digit === digit)?.value;
}
