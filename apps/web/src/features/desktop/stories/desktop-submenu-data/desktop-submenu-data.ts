// @codocs [[저장소 구성:앱 폴더 구조]]
// @codocs [[피그마 연동:스토리 규칙]]
// 바탕화면 메뉴 조립(Menu/Desktop, Menu/ViewSubmenu, Menu/SortSubmenu) 스토리가 함께 쓰는 고정 데이터다. 피그마 조립과 같은 글자·아이콘·켜짐 상태를 둔다.
import { SEPARATOR } from '@/shared/stories/menu-icons/menu-icons';

/** 피그마 Menu/ViewSubmenu: 바탕화면 빈 곳 메뉴의 보기 하위 메뉴 */
export const MENU_VIEW_SUBMENU = [
  { kind: 'radio', label: '큰 아이콘', checked: false },
  { kind: 'radio', label: '보통 아이콘', checked: true },
  { kind: 'radio', label: '작은 아이콘', checked: false },
  SEPARATOR,
  { kind: 'checkbox', label: '아이콘 자동 정렬', checked: true },
] as const;

/** 피그마 Menu/SortSubmenu: 바탕화면 빈 곳 메뉴의 정렬 기준 하위 메뉴. 피그마는 세 항목 모두 골라진 모습이다 */
export const MENU_SORT_SUBMENU = [
  { kind: 'radio', label: '이름', checked: true },
  { kind: 'radio', label: '항목 유형', checked: true },
  { kind: 'radio', label: '수정한 날짜', checked: true },
] as const;
