// @codocs [[저장소 구성:앱 폴더 구조]]
// @codocs [[피그마 연동:스토리 규칙]]
// 탐색기 메뉴 조립(Menu/ExplorerEmpty, Menu/ExplorerViewSubmenu, Menu/ExplorerSortSubmenu) 스토리가 함께 쓰는 고정 데이터다. 피그마 조립과 같은 글자·아이콘·켜짐 상태를 둔다.
import { SEPARATOR } from '@/shared/stories/menu-icons/menu-icons';

/** 피그마 Menu/ExplorerViewSubmenu: 탐색기 빈 곳 메뉴의 보기 하위 메뉴. 피그마는 세 항목 모두 골라진 모습이다 */
export const MENU_EXPLORER_VIEW_SUBMENU = [
  { kind: 'radio', label: '큰 아이콘', checked: true },
  { kind: 'radio', label: '보통 아이콘', checked: true },
  { kind: 'radio', label: '자세히', checked: true },
] as const;

/** 피그마 Menu/ExplorerSortSubmenu: 탐색기 정렬 메뉴. 피그마는 모든 항목이 골라진 모습이다 */
export const MENU_EXPLORER_SORT_SUBMENU = [
  { kind: 'radio', label: '이름', checked: true },
  { kind: 'radio', label: '수정한 날짜', checked: true },
  { kind: 'radio', label: '유형', checked: true },
  SEPARATOR,
  { kind: 'radio', label: '오름차순', checked: true },
  { kind: 'radio', label: '내림차순', checked: true },
] as const;
