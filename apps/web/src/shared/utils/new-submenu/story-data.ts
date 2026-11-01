// @codocs [[저장소 구성:앱 폴더 구조]]
// @codocs [[피그마 연동:스토리 규칙]]
// 메뉴 조립 Menu/NewSubmenu 스토리의 항목이다. 바탕화면·탐색기 빈 곳 메뉴가 쓰는 실제 메뉴 함수로 만든다.
import { ignoreMenuAction } from '@/shared/stories/menu-preview/menu-preview';
import { newMenuEntries } from '@/shared/utils/menu-items/menu-items';

/** 피그마 Menu/NewSubmenu: 빈 곳 메뉴의 새로 만들기 하위 메뉴 */
export const menuNewSubmenu = newMenuEntries(ignoreMenuAction);
