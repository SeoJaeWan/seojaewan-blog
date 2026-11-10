// @codocs [[저장소 구성:앱 폴더 구조]]
// @codocs [[피그마 연동:스토리 규칙]]
// 메뉴 조립 Menu/ChromeTabSearch 스토리의 항목이다. 실제 메뉴 함수에 피그마 조립과 같은 탭을 넣어 만든다.
import { ignoreMenuAction } from '@/shared/components/menu-popup/story-menu-preview';

import { getChromeTabSearchMenuEntries } from './tab-search-menu-entries';

/** 피그마 Menu/ChromeTabSearch: 탭 셋이 열린 Chrome의 탭 검색 메뉴 */
export const menuChromeTabSearch = getChromeTabSearchMenuEntries(
  [
    { title: 'TypeScript 제네릭 이해하기' },
    { title: 'React 19 훅 정리' },
    { title: 'CSS 컨테이너 쿼리 정리' },
  ],
  ignoreMenuAction,
);
