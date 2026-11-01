// @codocs [[저장소 구성:앱 폴더 구조]]
// @codocs [[피그마 연동:스토리 규칙]]
// 메뉴 조립 Menu/Multiple 스토리의 항목이다. 실제 메뉴 함수에 피그마 조립과 같은 상태를 넣어 만든다.
import { getItemMenuEntries } from '@/features/desktop/empty-menu/empty-menu-entries';
import { itemMenuOptions } from '@/features/desktop/empty-menu/view-submenu/story-data';

/** 피그마 Menu/Multiple: 바탕화면 여러 개 선택 우클릭 */
export const menuMultiple = getItemMenuEntries(itemMenuOptions(null));
