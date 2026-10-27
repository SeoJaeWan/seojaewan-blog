// @codocs [[저장소 구성:앱 폴더 구조]]
// @codocs [[피그마 연동:스토리 규칙]]
// 바탕화면 메뉴 조립(Menu/Desktop, Menu/ViewSubmenu, Menu/SortSubmenu) 스토리가 함께 쓰는 고정 데이터다. 피그마 조립과 같은 글자·아이콘·켜짐 상태를 둔다.
import { SEPARATOR } from '@/shared/stories/menu-icons/menu-icons';

/** 피그마 Menu/ViewSubmenu: 바탕화면 빈 곳 메뉴의 보기 하위 메뉴. 기본값인 보통 아이콘이 골라져 있다 */
export const MENU_VIEW_SUBMENU = [
  {
    kind: 'radio-group',
    value: 'medium',
    options: [
      { value: 'large', label: '큰 아이콘' },
      { value: 'medium', label: '보통 아이콘' },
      { value: 'small', label: '작은 아이콘' },
    ],
  },
  SEPARATOR,
  { kind: 'checkbox', label: '아이콘 자동 정렬', checked: true },
] as const;

/** 피그마 Menu/SortSubmenu: 바탕화면 빈 곳 메뉴의 정렬 기준 하위 메뉴. 기본값인 이름이 골라져 있다 */
export const MENU_SORT_SUBMENU = [
  {
    kind: 'radio-group',
    value: 'name',
    options: [
      { value: 'name', label: '이름' },
      { value: 'type', label: '항목 유형' },
      { value: 'modified', label: '수정한 날짜' },
    ],
  },
] as const;
