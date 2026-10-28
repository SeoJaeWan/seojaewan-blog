// @codocs [[저장소 구성:앱 폴더 구조]]
// @codocs [[피그마 연동:스토리 규칙]]
// Chrome 창 조립 스토리가 쓰는 고정 데이터다. 피그마 Window/Chrome과 같은 값을 둔다.

import { POST_WINDOW } from '@/shared/stories/post/post';

/** 피그마 Window/Chrome `Tabs=Multiple`의 탭 제목들. 가운데 탭(지금 글)이 활성이다 */
export const MULTIPLE_TAB_TITLES = [
  'TypeScript 제네릭 이해하기',
  POST_WINDOW.tabTitle,
  'CSS 컨테이너 쿼리 정리',
] as const;
