// @codocs [[저장소 구성:앱 폴더 구조]]
// @codocs [[피그마 연동:스토리 규칙]]
// 메뉴 조립 Menu/ChromeMore 스토리의 항목이다. 실제 메뉴 함수에 피그마 조립과 같은 상태를 넣어 만든다.
import { getChromeMoreMenuEntries } from '@/features/chrome/utils/chrome-more-menu/chrome-more-menu';
import { ignoreMenuAction } from '@/shared/stories/menu-preview/menu-preview';

/** 피그마 Menu/ChromeMore: 글을 보는 데스크톱 Chrome ⋮ 메뉴. 배율은 100%다 */
export const menuChromeMore = getChromeMoreMenuEntries({
  isMobile: false,
  canCopyLink: true,
  canGoForward: true,
  zoom: 100,
  onCopyLink: ignoreMenuAction,
  onFind: ignoreMenuAction,
  onZoomOut: ignoreMenuAction,
  onZoomIn: ignoreMenuAction,
  onForward: ignoreMenuAction,
  onRefresh: ignoreMenuAction,
});
