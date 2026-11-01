import { getSortEntries } from '@/features/file-explorer/components/explorer-body/sort-submenu/sort-submenu-entries';
import type { ViewMenuOptions } from '@/features/file-explorer/components/explorer-body/view-submenu/view-submenu-entries';
import type { MenuPopupEntry } from '@/shared/components/menu-popup/menu-popup';

/**
 * 휴지통 정렬 메뉴(피그마 Menu/RecycleBinSortSubmenu)의 항목을 만든다. 휴지통은 수정한 날짜 대신 삭제한 날짜, 유형 대신 원래 위치로
 * 정렬하므로 같은 정렬 기준(`modified`, `type`)에 휴지통 열 이름을 붙이고 피그마 차례(이름·원래 위치·삭제한 날짜)로 둔다.
 * 휴지통 명령 모음의 정렬 버튼과 휴지통 빈 곳 메뉴의 정렬 기준 하위 메뉴, 메뉴 조립 스토리가 쓴다.
 * @codocs [[파일 탐색기:보기와 정렬]]
 * @codocs [[파일 탐색기:휴지통 보기]]
 * @codocs [[디자인 시스템:조립]]
 * @param options 지금 정렬과 동작
 * @returns 메뉴 항목
 */
export function getRecycleBinSortMenuEntries(options: ViewMenuOptions): MenuPopupEntry[] {
  return getSortEntries(options, [
    { value: 'name', label: '이름' },
    { value: 'type', label: '원래 위치' },
    { value: 'modified', label: '삭제한 날짜' },
  ]);
}
