// @codocs [[저장소 구성:앱 폴더 구조]]
// @codocs [[피그마 연동:스토리 규칙]]
// 메뉴 조립 Menu/Post 스토리의 항목이다. 실제 메뉴 함수에 피그마 조립과 같은 상태를 넣어 만든다.
import { itemMenuOptions } from '@/features/desktop/stories/desktop-submenu-data/desktop-submenu-data';
import { getItemMenuEntries } from '@/features/desktop/utils/desktop-menu-entries/desktop-menu-entries';

/**
 * 피그마 Menu/Post: 바탕화면 글 우클릭.
 * 실제 글 메뉴에는 [[바탕화면:아이콘 우클릭 메뉴]]대로 잘라내기가 있지만 피그마 조립에는 아직 없어, 피그마에 더할 때까지 스토리에서만 뺀다.
 */
export const menuPost = getItemMenuEntries(itemMenuOptions('post')).filter(
  (entry) => !('label' in entry && entry.label === '잘라내기'),
);
