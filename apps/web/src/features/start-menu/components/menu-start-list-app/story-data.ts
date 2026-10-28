// @codocs [[저장소 구성:앱 폴더 구조]]
// @codocs [[피그마 연동:스토리 규칙]]
// 메뉴 조립 Menu/StartListApp 스토리의 항목이다. 실제 메뉴 함수에 피그마 조립과 같은 상태를 넣어 만든다.
import { getListMenuEntries } from '@/features/start-menu/utils/start-menu-entries/start-menu-entries';
import { ignoreMenuAction } from '@/shared/stories/menu-preview/menu-preview';

/** 피그마 Menu/StartListApp: Start 모두 목록의 앱 항목(시작 화면·작업 표시줄에 고정하지 않음) 우클릭 */
export const menuStartListApp = getListMenuEntries({
  isPinnedToStart: false,
  canCopyLink: false,
  isPinnedToTaskbar: false,
  onOpen: ignoreMenuAction,
  onToggleStartPin: ignoreMenuAction,
  onCopyLink: ignoreMenuAction,
  onToggleTaskbarPin: ignoreMenuAction,
});
