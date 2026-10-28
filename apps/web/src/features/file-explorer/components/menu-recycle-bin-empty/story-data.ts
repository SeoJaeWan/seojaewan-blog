// @codocs [[저장소 구성:앱 폴더 구조]]
// @codocs [[피그마 연동:스토리 규칙]]
// 메뉴 조립 Menu/RecycleBinEmpty 스토리가 쓰는 고정 데이터다. 피그마 조립과 같은 글자·아이콘·켜짐 상태를 둔다.
import { MENU_RECYCLE_BIN_SORT_SUBMENU } from '@/features/file-explorer/stories/recycle-bin-submenu-data/recycle-bin-submenu-data';
import type { MenuPopupEntry } from '@/shared/components/menu-popup/menu-popup';
import { ICON, SEPARATOR } from '@/shared/stories/menu-icons/menu-icons';

/**
 * 피그마 Menu/RecycleBinEmpty: 탐색기 휴지통 빈 곳 우클릭. 펼친 하위 메뉴(Submenu)에 따라 항목이 달라진다
 * @param submenu 펼친 하위 메뉴
 * @returns 메뉴 항목
 */
export function menuRecycleBinEmpty(submenu: 'none' | 'sort'): readonly MenuPopupEntry[] {
  return [
    {
      kind: 'submenu',
      label: '정렬 기준',
      icon: ICON.sort,
      submenu: submenu === 'sort' ? MENU_RECYCLE_BIN_SORT_SUBMENU : undefined,
    },
    { label: '새로 고침', icon: ICON.refresh },
    SEPARATOR,
    { label: '휴지통 비우기', icon: ICON.delete },
  ];
}
