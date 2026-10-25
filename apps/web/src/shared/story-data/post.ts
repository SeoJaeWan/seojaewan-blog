// @codocs [[저장소 구성:앱 폴더 구조]]
// @codocs [[피그마 연동:스토리 규칙]]
// 글 하나(React 19 훅 정리)를 보여 주는 조립 스토리가 함께 쓰는 고정 데이터다. Chrome 글 화면(Chrome/Page)과
// Chrome 창(Window/Chrome), 그 창을 줄여 넣는 창 축소 화면(Window/SnapAssist 등)이 같은 글을 그려서 기능 사이에 둔다.

/** 피그마 Window/Chrome의 탭 제목과 주소창 주소 */
export const POST_WINDOW = {
  tabTitle: 'React 19 훅 정리',
  url: 'seojaewan.com/posts/react-19-hooks',
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
