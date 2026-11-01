// @codocs [[저장소 구성:앱 폴더 구조]]
// @codocs [[피그마 연동:스토리 규칙]]
// 검색 조립(Search/Body, Search/Panel)과 Start 조립 스토리가 함께 쓰는 고정 데이터다. 피그마 조립과 같은 값을 둔다.

/** 피그마 Search/Body `View=Before typing`의 최근 묶음 */
export const SEARCH_RECENT = [
  { id: 'blog', kind: 'folder', title: 'Blog' },
  { id: 'post:react-19-hooks', kind: 'post', title: 'React 19 훅 정리' },
  { id: 'link:github', kind: 'link', title: 'GitHub' },
] as const;

/** 피그마 Search/Body `View=Before typing, Device=Desktop`의 추천 글 6개. 모바일은 앞의 3개만 보인다 */
export const SEARCH_RECOMMENDED = [
  { id: 'post:react-19-hooks', title: 'React 19 훅 정리', date: '2026-10-20' },
  {
    id: 'post:react-server-components',
    title: '리액트 서버 컴포넌트 이해하기',
    date: '2026-10-12',
  },
  { id: 'post:nextjs-app-router-cache', title: 'Next.js App Router 캐시', date: '2026-10-03' },
  { id: 'post:typescript-5-6', title: 'TypeScript 5.6 새 기능', date: '2026-09-25' },
  { id: 'post:css-container-queries', title: 'CSS Container Queries 정리', date: '2026-09-18' },
  { id: 'post:zustand-patterns', title: 'Zustand 상태 관리 패턴', date: '2026-09-10' },
] as const;

/** 피그마 Search/Body `View=Before typing, Device=Mobile`의 추천 글 개수 */
export const SEARCH_RECOMMENDED_MOBILE_COUNT = 3;

/** 피그마 Search/Body `View=Results`의 결과(검색어 "리액트") */
export const SEARCH_RESULTS = {
  bestMatch: {
    id: 'post:react-19-hooks-2',
    kind: 'post',
    title: '리액트 19 훅 정리',
    date: '2026-10-20',
  },
  folders: [{ id: 'folder:리액트', kind: 'folder', title: '리액트' }],
  posts: [
    { id: 'post:react-server-components', kind: 'post', title: '리액트 서버 컴포넌트 이해하기' },
    { id: 'post:react-query-cache', kind: 'post', title: '리액트 쿼리 캐시 전략' },
  ],
  links: [{ id: 'link:react-study', kind: 'link', title: '리액트 스터디 노트' }],
} as const;

/** 피그마 Search/Panel `Device=Mobile` 입력칸의 안내 글자 */
export const SEARCH_PLACEHOLDER = '검색하려면 여기에 입력하세요';
