// @codocs [[저장소 구성:앱 폴더 구조]]
// @codocs [[피그마 연동:스토리 규칙]]
// 메뉴 조립 Menu/RecycleBinEmpty 스토리의 항목이다. 실제 메뉴 함수에 피그마 조립과 같은 상태(휴지통이 참)를 넣어 만든다.
import { emptyMenuOptions } from '@/features/file-explorer/stories/explorer-submenu-data/explorer-submenu-data';
import { getEmptyMenuEntries } from '@/features/file-explorer/utils/explorer-menu-entries/explorer-menu-entries';
import type { MenuPopupEntry } from '@/shared/components/menu-popup/menu-popup';
import { previewMenu } from '@/shared/stories/menu-preview/menu-preview';

// 피그마 Submenu 변형마다 펼친 하위 메뉴 항목의 이름이다.
const OPEN_SUBMENUS = { none: undefined, sort: '정렬 기준' } as const;

/**
 * 피그마 Menu/RecycleBinEmpty: 탐색기 휴지통 빈 곳 우클릭. 펼친 하위 메뉴(Submenu)에 따라 항목이 달라진다
 * @param submenu 펼친 하위 메뉴
 * @returns 메뉴 항목
 */
export function menuRecycleBinEmpty(
  submenu: keyof typeof OPEN_SUBMENUS,
): readonly MenuPopupEntry[] {
  return previewMenu(getEmptyMenuEntries(emptyMenuOptions(true)), OPEN_SUBMENUS[submenu]);
}
