// @codocs [[저장소 구성:앱 폴더 구조]]
// @codocs [[피그마 연동:스토리 규칙]]
// 메뉴 조립 Menu/ExplorerPost 스토리의 항목이다. 실제 메뉴 함수에 피그마 조립과 같은 상태를 넣어 만든다.
import { itemMenuOptions } from '@/features/file-explorer/stories/explorer-submenu-data/explorer-submenu-data';
import { getItemMenuEntries } from '@/features/file-explorer/utils/explorer-menu-entries/explorer-menu-entries';

/** 피그마 Menu/ExplorerPost: 탐색기 글 우클릭 */
export const menuExplorerPost = getItemMenuEntries(itemMenuOptions('post'));
