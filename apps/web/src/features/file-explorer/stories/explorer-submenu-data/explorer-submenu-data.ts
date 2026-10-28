// @codocs [[저장소 구성:앱 폴더 구조]]
// @codocs [[피그마 연동:스토리 규칙]]
// @codocs [[디자인 시스템:조립]]
// 탐색기 메뉴 조립(Menu/ExplorerEmpty·ExplorerViewSubmenu·ExplorerSortSubmenu, 휴지통 메뉴, 항목 메뉴) 스토리가 함께 쓰는 입력이다.
// 실제 메뉴 함수에 피그마 조립과 같은 상태를 넣는다.
import type {
  getEmptyMenuEntries,
  getItemMenuEntries,
} from '@/features/file-explorer/utils/explorer-menu-entries/explorer-menu-entries';
import {
  getSortMenuEntries,
  getViewMenuEntries,
} from '@/features/file-explorer/utils/explorer-menu-entries/explorer-menu-entries';
import { ignoreMenuAction } from '@/shared/stories/menu-preview/menu-preview';
import type { WorkspaceItemKind } from '@/shared/utils/workspace-rules/workspace-rules';
import { DEFAULT_EXPLORER_VIEW } from '@/shared/utils/workspace-rules/workspace-rules';

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
 * 피그마 탐색기 항목 메뉴(Menu/ExplorerFolder·ExplorerPost·RecycleItem)의 상태다. 데스크톱이고, 고정하지 않았고 휴지통으로 보낼 수 있다.
 * @param kind 우클릭한 항목 종류
 * @param isInRecycleBin 휴지통 안의 항목인지
 * @returns 항목 메뉴 함수의 입력
 */
export function itemMenuOptions(
  kind: WorkspaceItemKind,
  isInRecycleBin = false,
): Parameters<typeof getItemMenuEntries>[0] {
  return {
    kind,
    isInRecycleBin,
    isMobile: false,
    isPinned: false,
    canTrash: true,
    onOpen: ignoreMenuAction,
    onOpenInNewTab: ignoreMenuAction,
    onOpenInNewWindow: ignoreMenuAction,
    onCopyLink: ignoreMenuAction,
    onTogglePin: ignoreMenuAction,
    onCut: ignoreMenuAction,
    onRename: ignoreMenuAction,
    onTrash: ignoreMenuAction,
    onRestore: ignoreMenuAction,
  };
}

/** 피그마 Menu/ExplorerViewSubmenu: 탐색기 빈 곳 메뉴의 보기 하위 메뉴. 기본값인 보통 아이콘이 골라져 있다 */
export const menuExplorerViewSubmenu = getViewMenuEntries(emptyMenuOptions(false));

/** 피그마 Menu/ExplorerSortSubmenu: 탐색기 정렬 메뉴. 정렬 기준과 방향이 각각 묶음이고, 기본값인 이름·오름차순이 골라져 있다 */
export const menuExplorerSortSubmenu = getSortMenuEntries(emptyMenuOptions(false));
