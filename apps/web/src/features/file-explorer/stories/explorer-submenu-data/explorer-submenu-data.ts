// @codocs [[저장소 구성:앱 폴더 구조]]
// @codocs [[피그마 연동:스토리 규칙]]
// 탐색기 메뉴 조립(Menu/ExplorerEmpty, Menu/ExplorerViewSubmenu, Menu/ExplorerSortSubmenu) 스토리가 함께 쓰는 고정 데이터다. 피그마 조립과 같은 글자·아이콘·켜짐 상태를 둔다.
import { SEPARATOR } from '@/shared/stories/menu-icons/menu-icons';

/** 피그마 Menu/ExplorerViewSubmenu: 탐색기 빈 곳 메뉴의 보기 하위 메뉴. 기본값인 보통 아이콘이 골라져 있다 */
export const MENU_EXPLORER_VIEW_SUBMENU = [
  {
    kind: 'radio-group',
    value: 'medium',
    options: [
      { value: 'large', label: '큰 아이콘' },
      { value: 'medium', label: '보통 아이콘' },
      { value: 'details', label: '자세히' },
    ],
  },
] as const;

/** 피그마 Menu/ExplorerSortSubmenu: 탐색기 정렬 메뉴. 정렬 기준과 방향이 각각 묶음이고, 기본값인 이름·오름차순이 골라져 있다 */
export const MENU_EXPLORER_SORT_SUBMENU = [
  {
    kind: 'radio-group',
    value: 'name',
    options: [
      { value: 'name', label: '이름' },
      { value: 'modified', label: '수정한 날짜' },
      { value: 'type', label: '유형' },
    ],
  },
  SEPARATOR,
  {
    kind: 'radio-group',
    value: 'ascending',
    options: [
      { value: 'ascending', label: '오름차순' },
      { value: 'descending', label: '내림차순' },
    ],
  },
] as const;
