// @codocs [[저장소 구성:앱 폴더 구조]]
// @codocs [[피그마 연동:스토리 규칙]]
// Chrome 페이지 조립 스토리가 함께 쓰는 고정 데이터다. 피그마 조립과 같은 값을 둔다.

/** 피그마 `file/Document` 인스턴스(글 아이콘)의 자산 */
export const POST_ICON = 'images/file-document';

/** 피그마 Chrome/Page `Page=New tab`: 최신 글 바로가기 */
export const NEW_TAB_LATEST_POSTS = [
  'React 19 훅 정리',
  '리액트 서버 컴포넌트',
  'Next.js 캐시',
  'TypeScript 5.6',
  'Vitest 테스트',
  'Figma 일치 검사',
] as const;

/** 피그마 Chrome/Page `Page=Search results`: 검색어와 결과(피그마 조립의 주소 글자를 그대로 둔다) */
export const SEARCH_RESULTS = {
  query: '리액트',
  results: [
    {
      title: '리액트 서버 컴포넌트 이해하기',
      date: '2026-10-12',
      url: 'seojaewan.com/posts/react-19-hooks',
    },
    {
      title: '리액트 쿼리로 서버 상태 다루기',
      date: '2026-08-03',
      url: 'seojaewan.com/posts/react-19-hooks',
    },
  ],
} as const;

/** 피그마 Chrome/Page `Page=Not found`: 찾지 못한 주소 */
export const NOT_FOUND_URL = 'seojaewan.com/posts/react-20';
