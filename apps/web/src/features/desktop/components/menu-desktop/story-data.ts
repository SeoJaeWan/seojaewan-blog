// @codocs [[저장소 구성:앱 폴더 구조]]
// @codocs [[피그마 연동:스토리 규칙]]
// 메뉴 조립 Menu/Desktop 스토리의 항목이다. 실제 메뉴 함수에 피그마 조립과 같은 상태를 넣어 만든다.
import { desktopMenuOptions } from '@/features/desktop/stories/desktop-submenu-data/desktop-submenu-data';
import { getDesktopMenuEntries } from '@/features/desktop/utils/desktop-menu-entries/desktop-menu-entries';
import type { MenuPopupEntry } from '@/shared/components/menu-popup/menu-popup';
import { previewMenu } from '@/shared/stories/menu-preview/menu-preview';

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
