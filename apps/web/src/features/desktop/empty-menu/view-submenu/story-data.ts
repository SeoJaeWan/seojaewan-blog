// @codocs [[저장소 구성:앱 폴더 구조]]
// @codocs [[피그마 연동:스토리 규칙]]
// 메뉴 조립 Menu/ViewSubmenu 스토리의 항목이다. 실제 메뉴 함수에 피그마 조립과 같은 상태를 넣어 만든다.
import { desktopMenuOptions } from '@/features/desktop/empty-menu/story-data';

import { getDesktopViewMenuEntries } from './view-submenu-entries';

/** 피그마 Menu/ViewSubmenu: 바탕화면 빈 곳 메뉴의 보기 하위 메뉴. 기본값인 보통 아이콘이 골라져 있다 */
export const menuViewSubmenu = getDesktopViewMenuEntries(desktopMenuOptions);
