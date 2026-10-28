// @codocs [[저장소 구성:앱 폴더 구조]]
// @codocs [[피그마 연동:스토리 규칙]]
// @codocs [[디자인 시스템:조립]]
// 바탕화면 메뉴 조립(Menu/Desktop·ViewSubmenu·SortSubmenu와 아이콘 메뉴) 스토리가 함께 쓰는 입력이다. 실제 메뉴 함수에 피그마 조립과 같은 상태를 넣는다.
import type {
  getDesktopMenuEntries,
  getItemMenuEntries,
} from '@/features/desktop/utils/desktop-menu-entries/desktop-menu-entries';
import {
  getDesktopSortMenuEntries,
  getDesktopViewMenuEntries,
} from '@/features/desktop/utils/desktop-menu-entries/desktop-menu-entries';
import { ignoreMenuAction } from '@/shared/stories/menu-preview/menu-preview';
import type { WorkspaceItemKind } from '@/shared/utils/workspace-rules/workspace-rules';

/** 피그마 바탕화면 빈 곳 메뉴의 상태: 보통 아이콘, 아이콘 자동 정렬 켜짐, 이름순, 붙여넣기 가능 */
export const desktopMenuOptions = {
  iconSize: 'medium',
  isAutoArrange: true,
  isAutoArrangeLocked: false,
  sortBy: 'name',
  canPaste: true,
  onIconSizeChange: ignoreMenuAction,
  onAutoArrangeChange: ignoreMenuAction,
  onSortByChange: ignoreMenuAction,
  onRefresh: ignoreMenuAction,
  onPaste: ignoreMenuAction,
  onNewFolder: ignoreMenuAction,
} satisfies Parameters<typeof getDesktopMenuEntries>[0];

/** 피그마 Menu/ViewSubmenu: 바탕화면 빈 곳 메뉴의 보기 하위 메뉴. 기본값인 보통 아이콘이 골라져 있다 */
export const menuViewSubmenu = getDesktopViewMenuEntries(desktopMenuOptions);

/** 피그마 Menu/SortSubmenu: 바탕화면 빈 곳 메뉴의 정렬 기준 하위 메뉴. 기본값인 이름이 골라져 있다 */
export const menuSortSubmenu = getDesktopSortMenuEntries(desktopMenuOptions);

/**
 * 피그마 아이콘 메뉴(Menu/Folder·Post·Link·RecycleBin·Multiple)의 상태다. 고정하지 않았고 휴지통으로 보낼 수 있으며, 휴지통은 찼다.
 * @param kind 우클릭한 항목 종류. 여러 개면 null
 * @returns 아이콘 메뉴 함수의 입력
 */
export function itemMenuOptions(
  kind: WorkspaceItemKind | null,
): Parameters<typeof getItemMenuEntries>[0] {
  return {
    kind,
    isPinned: false,
    canTrash: true,
    isRecycleBinEmpty: false,
    onOpen: ignoreMenuAction,
    onOpenInNewWindow: ignoreMenuAction,
    onCopyLink: ignoreMenuAction,
    onTogglePin: ignoreMenuAction,
    onCut: ignoreMenuAction,
    onRename: ignoreMenuAction,
    onTrash: ignoreMenuAction,
    onEmptyRecycleBin: ignoreMenuAction,
  };
}
