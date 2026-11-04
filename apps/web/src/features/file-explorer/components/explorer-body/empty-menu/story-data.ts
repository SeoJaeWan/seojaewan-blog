// @codocs [[저장소 구성:앱 폴더 구조]]
// @codocs [[피그마 연동:스토리 규칙]]
// @codocs [[디자인 시스템:조립]]
// 메뉴 조립 Menu/ExplorerEmpty·RecycleBinEmpty 스토리의 항목이다. 하위 메뉴 스토리도 같은 상태를 쓴다. 실제 메뉴 함수에 피그마 조립과 같은 상태를 넣어 만든다.
import type { MenuPopupEntry } from '@/shared/components/menu-popup/menu-popup';
import { ignoreMenuAction, previewMenu } from '@/shared/components/menu-popup/story-menu-preview';
import { DEFAULT_EXPLORER_VIEW } from '@/shared/utils/workspace-rules/workspace-rules';

import { getEmptyMenuEntries } from './empty-menu-entries';

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

/** 실제 탐색기 빈 곳 메뉴 항목. 하위 메뉴가 열리는 `play` 스토리가 쓴다 */
export const menuExplorerEmptyLive = getEmptyMenuEntries(emptyMenuOptions(false));

/** 실제 휴지통 빈 곳 메뉴 항목. 하위 메뉴가 열리는 `play` 스토리가 쓴다 */
export const menuRecycleBinEmptyLive = getEmptyMenuEntries(emptyMenuOptions(true));

/** 피그마 Menu/ExplorerEmpty: 탐색기 빈 곳 우클릭. 하위 메뉴는 닫은 모양이다 */
export const menuExplorerEmpty: readonly MenuPopupEntry[] = previewMenu(menuExplorerEmptyLive);

/** 피그마 Menu/RecycleBinEmpty: 탐색기 휴지통 빈 곳 우클릭. 하위 메뉴는 닫은 모양이다 */
export const menuRecycleBinEmpty: readonly MenuPopupEntry[] = previewMenu(menuRecycleBinEmptyLive);
