// @codocs [[저장소 구성:앱 폴더 구조]]
// @codocs [[피그마 연동:스토리 규칙]]
// 메뉴 조립 Menu/NewSubmenu 스토리가 쓰는 고정 데이터다. 피그마 조립과 같은 글자·아이콘·켜짐 상태를 둔다.
import { ICON } from '@/shared/stories/menu-icons/menu-icons';

/** 피그마 Menu/NewSubmenu: 빈 곳 메뉴의 새로 만들기 하위 메뉴 */
export const MENU_NEW_SUBMENU = [{ label: '폴더', icon: ICON.folderAdd }] as const;
