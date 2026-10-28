// @codocs [[저장소 구성:앱 폴더 구조]]
// @codocs [[피그마 연동:스토리 규칙]]
// Start 보기 전환 메뉴(Menu/ViewOptions)를 그리는 스토리가 함께 쓰는 항목이다. 실제 메뉴 함수에 피그마 조립과 같은 상태를 넣어 만든다.
import { getViewMenuEntries } from '@/features/start-menu/utils/start-menu-entries/start-menu-entries';
import { ignoreMenuAction } from '@/shared/stories/menu-preview/menu-preview';

/** 피그마 Menu/ViewOptions: Start `보기:` 전환 메뉴. 그리드가 골라져 있다 */
export const menuViewOptions = getViewMenuEntries('grid', ignoreMenuAction);
