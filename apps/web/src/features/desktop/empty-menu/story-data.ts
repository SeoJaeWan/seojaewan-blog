// @codocs [[저장소 구성:앱 폴더 구조]]
// @codocs [[피그마 연동:스토리 규칙]]
// @codocs [[디자인 시스템:조립]]
// 메뉴 조립 Menu/Desktop 스토리의 항목이다. 하위 메뉴 스토리도 같은 상태를 쓴다. 실제 메뉴 함수에 피그마 조립과 같은 상태를 넣어 만든다.
import type { MenuPopupEntry } from '@/shared/components/menu-popup/menu-popup';
import { ignoreMenuAction, previewMenu } from '@/shared/components/menu-popup/story-menu-preview';

import { getDesktopMenuEntries } from './empty-menu-entries';

/** 피그마 바탕화면 빈 곳 메뉴의 상태: 보통 아이콘, 아이콘 자동 정렬 켜짐, 이름순, 붙여넣기 가능 */
export const desktopMenuOptions = {
  iconSize: 'medium',
  isAutoArrange: true,
  isAutoArrangeLocked: false,
  isMobile: false,
  sortBy: 'name',
  canPaste: true,
  onIconSizeChange: ignoreMenuAction,
  onAutoArrangeChange: ignoreMenuAction,
  onSortByChange: ignoreMenuAction,
  onRefresh: ignoreMenuAction,
  onPaste: ignoreMenuAction,
  onNewFolder: ignoreMenuAction,
} satisfies Parameters<typeof getDesktopMenuEntries>[0];

/** 실제 바탕화면 빈 곳 메뉴 항목. 하위 메뉴가 열리는 `play` 스토리가 쓴다 */
export const menuDesktopLive = getDesktopMenuEntries(desktopMenuOptions);

/**
 * 피그마 Menu/Desktop: 바탕화면 빈 곳 우클릭. 하위 메뉴는 닫은 모양이다.
 * @param canPaste 붙여넣을 것이 있는지(피그마 `Paste`). 있으면 단추 줄에 붙여넣기가 있다
 * @returns 스토리에 그릴 항목
 */
export function menuDesktop(canPaste: boolean): readonly MenuPopupEntry[] {
  return previewMenu(getDesktopMenuEntries({ ...desktopMenuOptions, canPaste }));
}
