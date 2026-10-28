// @codocs [[저장소 구성:앱 폴더 구조]]
// @codocs [[피그마 연동:스토리 규칙]]
// 휴지통 메뉴 조립(Menu/RecycleBinEmpty, Menu/RecycleBinSortSubmenu) 스토리가 함께 쓰는 고정 데이터다. 피그마 조립과 같은 글자·아이콘·켜짐 상태를 둔다.
import { SEPARATOR } from '@/shared/stories/menu-icons/menu-icons';

/** 피그마 Menu/RecycleBinSortSubmenu: 휴지통 정렬 메뉴. 정렬 기준과 방향이 각각 묶음이고, 기본값인 이름·오름차순이 골라져 있다 */
export const MENU_RECYCLE_BIN_SORT_SUBMENU = [
  {
    kind: 'radio-group',
    value: 'name',
    options: [
      { value: 'name', label: '이름' },
      { value: 'original-location', label: '원래 위치' },
      { value: 'deleted', label: '삭제한 날짜' },
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
