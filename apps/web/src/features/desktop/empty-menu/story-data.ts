// @codocs [[저장소 구성:앱 폴더 구조]]
// @codocs [[피그마 연동:스토리 규칙]]
// @codocs [[디자인 시스템:조립]]
// 메뉴 조립 Menu/Desktop 스토리의 항목이다. 하위 메뉴 스토리도 같은 상태를 쓴다. 실제 메뉴 함수에 피그마 조립과 같은 상태를 넣어 만든다.
import type { MenuPopupEntry } from '@/shared/components/menu-popup/menu-popup';
import { ignoreMenuAction, previewMenu } from '@/shared/stories/menu-preview/menu-preview';

import { getDesktopMenuEntries } from './empty-menu-entries';

/** 피그마 바탕화면 빈 곳 메뉴의 상태: 보통 아이콘, 아이콘 자동 정렬 켜짐, 이름순, 붙여넣기 가능 */
export const desktopMenuOptions = {
  iconSize: 'medium',
  isAutoArrange: true,
  isAutoArrangeLocked: false,
  sortBy: 'name',
  canPaste: true,
  onIconSizeChange: ignoreMenuAction,
  onAutoArrangeChange: ignoreMenuAction,
  onSortByChange: ignoreMenuAction,
  onRefresh: ignoreMenuAction,
  onPaste: ignoreMenuAction,
  onNewFolder: ignoreMenuAction,
} satisfies Parameters<typeof getDesktopMenuEntries>[0];

// 피그마 Submenu 변형마다 펼친 하위 메뉴 항목의 이름이다.
const OPEN_SUBMENUS = { none: undefined, view: '보기', sort: '정렬 기준' } as const;

/**
 * 피그마 Menu/Desktop: 바탕화면 빈 곳 우클릭. 펼친 하위 메뉴(Submenu)에 따라 항목이 달라진다
 * @param submenu 펼친 하위 메뉴
 * @returns 메뉴 항목
 */
export function menuDesktop(submenu: keyof typeof OPEN_SUBMENUS): readonly MenuPopupEntry[] {
  return previewMenu(getDesktopMenuEntries(desktopMenuOptions), OPEN_SUBMENUS[submenu]);
}
