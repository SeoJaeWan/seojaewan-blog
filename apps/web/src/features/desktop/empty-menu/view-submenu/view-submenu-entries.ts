import type { MenuPopupEntry } from '@/shared/components/menu-popup/menu-popup';
import { MENU_SEPARATOR, singleChoiceEntry } from '@/shared/utils/menu-items/menu-items';
import type { DesktopIconSize } from '@/shared/utils/workspace-rules/workspace-rules';

/** 보기 하위 메뉴가 보이는 설정과 동작. isAutoArrangeLocked는 자동 정렬을 바꿀 수 없는지(모바일은 늘 자동 정렬이다)다. */
export type DesktopViewMenuOptions = {
  iconSize: DesktopIconSize;
  isAutoArrange: boolean;
  isAutoArrangeLocked: boolean;
  onIconSizeChange: (iconSize: DesktopIconSize) => void;
  onAutoArrangeChange: (isAutoArrange: boolean) => void;
};

/**
 * 바탕화면 빈 곳 메뉴의 보기 하위 메뉴(피그마 Menu/ViewSubmenu) 항목을 만든다.
 * 모바일은 늘 자동 정렬이라 아이콘 자동 정렬 항목을 고를 수 없다.
 * @codocs [[바탕화면 우클릭 메뉴:빈 곳]]
 * @codocs [[바탕화면 아이콘:모바일]]
 * @param options 지금 설정과 동작
 * @returns 메뉴 항목
 */
export function getDesktopViewMenuEntries(options: DesktopViewMenuOptions): MenuPopupEntry[] {
  return [
    singleChoiceEntry(
      options.iconSize,
      [
        { value: 'large', label: '큰 아이콘' },
        { value: 'medium', label: '보통 아이콘' },
        { value: 'small', label: '작은 아이콘' },
      ],
      options.onIconSizeChange,
    ),
    MENU_SEPARATOR,
    {
      kind: 'checkbox',
      label: '아이콘 자동 정렬',
      isChecked: options.isAutoArrange,
      isDisabled: options.isAutoArrangeLocked,
      onCheckedChange: options.onAutoArrangeChange,
    },
  ];
}
