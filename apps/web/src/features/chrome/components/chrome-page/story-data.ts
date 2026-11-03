// @codocs [[저장소 구성:앱 폴더 구조]]
// @codocs [[피그마 연동:스토리 규칙]]
// Chrome 페이지 조립 스토리가 함께 쓰는 고정 데이터다. 피그마 조립과 같은 값을 둔다.
// 글 하나(React 19 훅 정리)는 Chrome 창(Window/Chrome)과 그 창을 줄여 넣는 창 축소 화면(Window/SnapAssist 등) 스토리도 그린다.

import type { CodeSyntax, CodeToken, PostBlock } from '@/shared/utils/post-body/post-body';

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

/** 피그마 Chrome/Page `Page=Search results`: 검색어와 결과(주소는 글마다 `/posts/<slug>`다) */
export const SEARCH_RESULTS = {
  query: '리액트',
  results: [
    {
      title: '리액트 서버 컴포넌트 이해하기',
      date: '2026-10-12',
      url: 'seojaewan.com/posts/react-server-components',
    },
    {
      title: '리액트 쿼리로 서버 상태 다루기',
      date: '2026-08-03',
      url: 'seojaewan.com/posts/react-query-server-state',
    },
  ],
} as const;

/** 피그마 Chrome/Page `Page=Not found`: 찾지 못한 주소 */
export const NOT_FOUND_URL = 'seojaewan.com/posts/react-20';

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

/**
 * 강조된 코드 글자 조각을 만든다.
 * @param text 글자
 * @param syntax 강조 색. 없으면 기본 코드 글자색
 * @returns 코드 글자 조각
 */
function token(text: string, syntax: CodeSyntax | null = null): CodeToken {
  return { text, syntax };
}

/**
 * 피그마 Chrome/Page `Page=Post` 코드 블록의 코드를 실제 강조기(`highlightCode`, tsx)로 강조한 결과(`code-syntax` 색).
 * 손으로 칠하지 않는다. 강조기 단위 테스트가 이 코드를 다시 강조해 같은지 확인한다.
 */
const postCodeLines: CodeToken[][] = [
  [
    token('const', 'keyword'),
    token(' '),
    token('post', 'variable-constant'),
    token(' '),
    token('=', 'punctuation'),
    token(' '),
    token('use', 'function'),
    token('('),
    token('fetchPost', 'function'),
    token('('),
    token('slug', 'variable'),
    token('))'),
    token(';', 'punctuation'),
  ],
  [
    token('return', 'keyword-control'),
    token(' '),
    token('<', 'tag'),
    token('Article', 'type'),
    token(' '),
    token('post', 'attribute'),
    token('=', 'punctuation'),
    token('{', 'keyword'),
    token('post', 'variable'),
    token('}', 'keyword'),
    token(' '),
    token('/>', 'tag'),
    token(';', 'punctuation'),
  ],
];

const postIntro: PostBlock = {
  type: 'paragraph',
  richText: [{ text: POST_BODY.intro, link: null }],
};

const postUseHeading: PostBlock = {
  type: 'heading_2',
  richText: [{ text: POST_BODY.useHeading, link: null }],
};

const postUseParagraph: PostBlock = {
  type: 'paragraph',
  richText: [
    { text: POST_BODY.useParagraph.before, link: null },
    { text: POST_BODY.useParagraph.link, link: 'https://react.dev' },
    { text: POST_BODY.useParagraph.after, link: null },
  ],
};

const postCode: PostBlock = {
  type: 'code',
  language: POST_BODY.code.language,
  code: POST_BODY.code.code,
  highlighted: postCodeLines,
};

const postFigure: PostBlock = {
  type: 'image',
  url: 'https://seojaewan.com/images/bloom.png',
  caption: [{ text: 'Bloom 배경화면', link: null }],
};

/**
 * 피그마 Chrome/Page `Page=Post`의 본문 블록(PostBlocks로 그린다). 넓은 창은 코드 블록 뒤에 제목·문단·그림까지,
 * 좁은 창은 코드 블록 뒤에 그림 하나를 둔다. 이미지는 임시 이미지(배경화면 Bloom)다.
 */
export const postPageBlocks: Record<'wide' | 'narrow', PostBlock[]> = {
  wide: [
    postIntro,
    postUseHeading,
    postUseParagraph,
    postCode,
    { type: 'heading_2', richText: [{ text: POST_BODY.actionStateHeading, link: null }] },
    { type: 'paragraph', richText: [{ text: POST_BODY.actionStateParagraph, link: null }] },
    postFigure,
  ],
  narrow: [postIntro, postUseHeading, postUseParagraph, postCode, postFigure],
};
