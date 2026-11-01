// @codocs [[저장소 구성:앱 폴더 구조]]
// @codocs [[피그마 연동:스토리 규칙]]
// @codocs [[디자인 시스템:조립]]
// 아이콘 메뉴 조립(Menu/Folder·Post·Link·RecycleBin·Multiple) 스토리의 항목이다. 실제 메뉴 함수에 피그마 조립과 같은 상태를 넣어 만든다.
import { ignoreMenuAction } from '@/shared/stories/menu-preview/menu-preview';
import type { WorkspaceItemKind } from '@/shared/utils/workspace-rules/workspace-rules';

import { getItemMenuEntries } from './item-menu-entries';

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

/** 피그마 Menu/Folder: 바탕화면 폴더 우클릭 */
export const menuFolder = getItemMenuEntries(itemMenuOptions('folder'));

/**
 * 피그마 Menu/Post: 바탕화면 글 우클릭.
 * 실제 글 메뉴에는 [[바탕화면 우클릭 메뉴:아이콘]]대로 잘라내기가 있지만 피그마 조립에는 아직 없어, 피그마에 더할 때까지 스토리에서만 뺀다.
 */
export const menuPost = getItemMenuEntries(itemMenuOptions('post')).filter(
  (entry) => !('label' in entry && entry.label === '잘라내기'),
);

/** 피그마 Menu/Link: 바탕화면 외부 링크 우클릭 */
export const menuLink = getItemMenuEntries(itemMenuOptions('link'));

/** 피그마 Menu/RecycleBin: 바탕화면 휴지통 우클릭 */
export const menuRecycleBin = getItemMenuEntries(itemMenuOptions('recycle-bin'));

/** 피그마 Menu/Multiple: 바탕화면 여러 개 선택 우클릭 */
export const menuMultiple = getItemMenuEntries(itemMenuOptions(null));
