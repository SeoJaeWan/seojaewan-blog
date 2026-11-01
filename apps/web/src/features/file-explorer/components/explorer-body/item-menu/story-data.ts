// @codocs [[저장소 구성:앱 폴더 구조]]
// @codocs [[피그마 연동:스토리 규칙]]
// @codocs [[디자인 시스템:조립]]
// 메뉴 조립 Menu/ExplorerFolder·ExplorerPost·RecycleItem 스토리의 항목이다. 실제 메뉴 함수에 피그마 조립과 같은 상태를 넣어 만든다.
import { ignoreMenuAction } from '@/shared/stories/menu-preview/menu-preview';
import type { WorkspaceItemKind } from '@/shared/utils/workspace-rules/workspace-rules';

import { getItemMenuEntries } from './item-menu-entries';

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

/** 피그마 Menu/ExplorerFolder: 탐색기 폴더 우클릭 */
export const menuExplorerFolder = getItemMenuEntries(itemMenuOptions('folder'));

/** 피그마 Menu/ExplorerPost: 탐색기 글 우클릭 */
export const menuExplorerPost = getItemMenuEntries(itemMenuOptions('post'));

/** 피그마 Menu/RecycleItem: 휴지통 안 항목 우클릭 */
export const menuRecycleItem = getItemMenuEntries(itemMenuOptions('post', true));
