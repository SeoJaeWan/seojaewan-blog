// @codocs [[저장소 구성:앱 폴더 구조]]
// @codocs [[피그마 연동:스토리 규칙]]
// 메뉴 조립 Menu/StartTile 스토리의 항목이다. 실제 메뉴 함수에 피그마 조립과 같은 상태를 넣어 만든다.
import { getPinnedMenuEntries } from '@/features/start-menu/utils/start-menu-entries/start-menu-entries';
import { ignoreMenuAction } from '@/shared/stories/menu-preview/menu-preview';

/** 피그마 Menu/StartTile: Start 고정 항목(맨 앞이 아닌 글이나 외부 링크) 우클릭 */
export const menuStartTile = getPinnedMenuEntries({
  canMoveToFront: true,
  canCopyLink: true,
  onOpen: ignoreMenuAction,
  onMoveToFront: ignoreMenuAction,
  onCopyLink: ignoreMenuAction,
  onUnpin: ignoreMenuAction,
});
