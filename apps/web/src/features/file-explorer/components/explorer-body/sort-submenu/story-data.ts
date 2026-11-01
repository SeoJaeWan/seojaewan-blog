// @codocs [[저장소 구성:앱 폴더 구조]]
// @codocs [[피그마 연동:스토리 규칙]]
// 메뉴 조립 Menu/ExplorerSortSubmenu 스토리의 항목이다. 실제 메뉴 함수에 피그마 조립과 같은 상태를 넣어 만든다.
import { emptyMenuOptions } from '@/features/file-explorer/components/explorer-body/empty-menu/story-data';

import { getSortMenuEntries } from './sort-submenu-entries';

/** 피그마 Menu/ExplorerSortSubmenu: 탐색기 정렬 메뉴. 정렬 기준과 방향이 각각 묶음이고, 기본값인 이름·오름차순이 골라져 있다 */
export const menuExplorerSortSubmenu = getSortMenuEntries(emptyMenuOptions(false));
