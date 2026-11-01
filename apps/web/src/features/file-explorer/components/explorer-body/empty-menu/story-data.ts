// @codocs [[저장소 구성:앱 폴더 구조]]
// @codocs [[피그마 연동:스토리 규칙]]
// @codocs [[디자인 시스템:조립]]
// 메뉴 조립 Menu/ExplorerEmpty·RecycleBinEmpty 스토리의 항목이다. 하위 메뉴 스토리도 같은 상태를 쓴다. 실제 메뉴 함수에 피그마 조립과 같은 상태를 넣어 만든다.
import type { MenuPopupEntry } from '@/shared/components/menu-popup/menu-popup';
import { ignoreMenuAction, previewMenu } from '@/shared/components/menu-popup/story-menu-preview';
import { DEFAULT_EXPLORER_VIEW } from '@/shared/utils/workspace-rules/workspace-rules';

import { getEmptyMenuEntries } from './empty-menu-entries';

// 피그마 Submenu 변형마다 펼친 하위 메뉴 항목의 이름이다.
const OPEN_SUBMENUS = { none: undefined, view: '보기', sort: '정렬 기준' } as const;

// 피그마 Menu/RecycleBinEmpty Submenu 변형마다 펼친 하위 메뉴 항목의 이름이다.
const RECYCLE_BIN_OPEN_SUBMENUS = { none: undefined, sort: '정렬 기준' } as const;

/**
 * 피그마 탐색기 빈 곳 메뉴의 상태: 기본 보기(보통 아이콘, 이름 오름차순), 붙여넣기 가능, 휴지통이 참
 * @param isRecycleBin 휴지통 보기인지
 * @returns 빈 곳 메뉴 함수의 입력
 */
export function emptyMenuOptions(isRecycleBin: boolean): Parameters<typeof getEmptyMenuEntries>[0] {
  return {
    view: DEFAULT_EXPLORER_VIEW,
    onViewChange: ignoreMenuAction,
    onSortByChange: ignoreMenuAction,
    onSortDirectionChange: ignoreMenuAction,
    isRecycleBin,
    canPaste: true,
    onPaste: ignoreMenuAction,
    onNewFolder: ignoreMenuAction,
    isRecycleBinEmpty: false,
    onRefresh: ignoreMenuAction,
    onEmptyRecycleBin: ignoreMenuAction,
  };
}

/**
 * 피그마 Menu/ExplorerEmpty: 탐색기 빈 곳 우클릭. 펼친 하위 메뉴(Submenu)에 따라 항목이 달라진다
 * @param submenu 펼친 하위 메뉴
 * @returns 메뉴 항목
 */
export function menuExplorerEmpty(submenu: keyof typeof OPEN_SUBMENUS): readonly MenuPopupEntry[] {
  return previewMenu(getEmptyMenuEntries(emptyMenuOptions(false)), OPEN_SUBMENUS[submenu]);
}

/**
 * 피그마 Menu/RecycleBinEmpty: 탐색기 휴지통 빈 곳 우클릭. 펼친 하위 메뉴(Submenu)에 따라 항목이 달라진다
 * @param submenu 펼친 하위 메뉴
 * @returns 메뉴 항목
 */
export function menuRecycleBinEmpty(
  submenu: keyof typeof RECYCLE_BIN_OPEN_SUBMENUS,
): readonly MenuPopupEntry[] {
  return previewMenu(
    getEmptyMenuEntries(emptyMenuOptions(true)),
    RECYCLE_BIN_OPEN_SUBMENUS[submenu],
  );
}
