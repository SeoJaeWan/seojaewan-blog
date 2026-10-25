// @codocs [[저장소 구성:앱 폴더 구조]]
// @codocs [[피그마 연동:스토리 규칙]]
// Chrome 조립 스토리가 함께 쓰는 고정 데이터다. 피그마 조립과 같은 값을 둔다.

/** 피그마 `file/Document` 인스턴스(글 아이콘)의 자산 */
export const POST_ICON = 'images/file-document.png';

/** 피그마 Chrome/AddressSuggestions: 주소창에 입력 중인 글자와 추천 목록 */
export const ADDRESS_SUGGESTIONS = {
  query: '리액',
  items: [
    { kind: 'post', title: '리액트 19 훅 정리', url: 'seojaewan.com/posts/react-19-hooks' },
    {
      kind: 'post',
      title: '리액트 서버 컴포넌트 이해하기',
      url: 'seojaewan.com/posts/react-server-components',
    },
    { kind: 'search', title: '리액트 검색' },
  ],
  /** 고른(Selected) 추천의 순서 */
  selectedIndex: 0,
} as const;

/** 피그마 Chrome/Page `Page=Post`: 글 머리·목차·꼬리 */
export const POST_PAGE = {
  meta: 'Blog › React · 2026-10-20',
  title: 'React 19의 새 훅 완전 정리',
  toc: [
    { label: 'use 훅', active: true },
    { label: 'useActionState', active: false },
    { label: 'useOptimistic', active: false },
    { label: '마이그레이션', active: false },
  ],
  previousTitle: '리액트 서버 컴포넌트 이해하기',
  nextTitle: 'React Compiler 도입기',
} as const;

/**
 * 피그마 Chrome/Page `Page=Post`의 본문 자리를 채운 글. 나중에 Notion 글 렌더링이 채우는 자리라 스토리에서만 쓴다.
 * 좁은 창(`Layout=Narrow`)은 피그마 조립처럼 코드 블록까지만 넣는다.
 */
export const POST_BODY = {
  intro:
    'React 19에는 폼과 비동기 상태를 다루는 새 훅이 여럿 들어왔다. 이 글은 use, useActionState, useOptimistic을 예제와 함께 정리한다.',
  useHeading: 'use 훅',
  useParagraph: {
    before: 'use는 Promise와 Context를 렌더링 중에 읽는 새 API다. 자세한 내용은 ',
    link: 'React 공식 문서',
    after: '를 참고한다.',
  },
  code: {
    language: 'tsx',
    code: 'const post = use(fetchPost(slug));\nreturn <Article post={post} />;',
  },
  actionStateHeading: 'useActionState',
  actionStateParagraph:
    '폼 제출 결과와 대기 상태를 한 번에 다룬다. 이전의 useFormState가 이름을 바꿔 react 패키지로 옮겨 왔다.',
} as const;

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
