// @codocs [[저장소 구성:앱 폴더 구조]]
// @codocs [[피그마 연동:스토리 규칙]]
// 메뉴 조립 Menu/StartTile 스토리의 항목이다. 실제 메뉴 함수에 피그마 조립과 같은 칸 위치를 넣어 만든다.
import type { MenuPopupEntry } from '@/shared/components/menu-popup/menu-popup';
import { ignoreMenuAction } from '@/shared/components/menu-popup/story-menu-preview';

import { getPinnedMenuEntries, getPinnedMoves } from './pinned-menu-entries';

/** 피그마 Menu/StartTile의 Position 값. 고정 칸이 화면에서 놓인 자리다. */
export type StartTilePosition = 'first' | 'second' | 'middle' | 'last';

// 칸 위치마다 고정 칸 5개 중 몇째 칸인지다.
const pinnedIndexes = {
  first: 0,
  second: 1,
  middle: 2,
  last: 4,
} as const satisfies Record<StartTilePosition, number>;

/**
 * 피그마 Menu/StartTile: Start 고정 항목(글이나 외부 링크) 우클릭. 칸 위치에 따라 이동 메뉴가 다르다.
 * @param position 고정 칸의 위치
 * @returns 메뉴 항목
 */
export function menuStartTile(position: StartTilePosition): MenuPopupEntry[] {
  return getPinnedMenuEntries({
    moves: getPinnedMoves(pinnedIndexes[position], 5),
    canCopyLink: true,
    onOpen: ignoreMenuAction,
    onMoveToFront: ignoreMenuAction,
    onMoveLeft: ignoreMenuAction,
    onMoveRight: ignoreMenuAction,
    onCopyLink: ignoreMenuAction,
    onUnpin: ignoreMenuAction,
  });
}
