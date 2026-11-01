// @codocs [[저장소 구성:앱 폴더 구조]]
// @codocs [[피그마 연동:스토리 규칙]]
// 메뉴 조립 Menu/ExplorerViewSubmenu 스토리의 항목이다. 실제 메뉴 함수에 피그마 조립과 같은 상태를 넣어 만든다.
import { emptyMenuOptions } from '@/features/file-explorer/components/explorer-body/empty-menu/story-data';

import { getViewMenuEntries } from './view-submenu-entries';

/** 피그마 Menu/ExplorerViewSubmenu: 탐색기 빈 곳 메뉴의 보기 하위 메뉴. 기본값인 보통 아이콘이 골라져 있다 */
export const menuExplorerViewSubmenu = getViewMenuEntries(emptyMenuOptions(false));
