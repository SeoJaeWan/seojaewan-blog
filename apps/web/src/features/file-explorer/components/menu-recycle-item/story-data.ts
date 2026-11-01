// @codocs [[저장소 구성:앱 폴더 구조]]
// @codocs [[피그마 연동:스토리 규칙]]
// 메뉴 조립 Menu/RecycleItem 스토리의 항목이다. 탐색기 휴지통 안 항목의 실제 메뉴 함수에 피그마 조립과 같은 상태를 넣어 만든다.
import { getItemMenuEntries } from '@/features/file-explorer/components/explorer-body/empty-menu/empty-menu-entries';
import { itemMenuOptions } from '@/features/file-explorer/components/explorer-body/view-submenu/story-data';

/** 피그마 Menu/RecycleItem: 휴지통 안 항목 우클릭 */
export const menuRecycleItem = getItemMenuEntries(itemMenuOptions('post', true));
