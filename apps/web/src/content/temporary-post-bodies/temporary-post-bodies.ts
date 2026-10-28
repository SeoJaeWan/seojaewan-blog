import 'server-only';

import type { PostBlock, RichText } from '@/shared/utils/post-body/post-body';

// 제목 단계마다의 Notion 블록 종류다.
const HEADING_TYPES = { 1: 'heading_1', 2: 'heading_2', 3: 'heading_3' } as const;

/**
 * 글자만 있는 글자 조각을 만든다.
 * @param value 글자
 * @returns 글자 조각
 */
function text(value: string): RichText {
  return { text: value, link: null };
}

/**
 * 링크 글자 조각을 만든다.
 * @param label 글자
 * @param href 링크 주소
 * @returns 글자 조각
 */
function link(label: string, href: string): RichText {
  return { text: label, link: href };
}

/**
 * 문단 블록을 만든다.
 * @param parts 글자 조각들(문자열은 링크 없는 글자)
 * @returns 문단 블록
 */
function paragraph(...parts: readonly (string | RichText)[]): PostBlock {
  return {
    type: 'paragraph',
    richText: parts.map((part) => (typeof part === 'string' ? text(part) : part)),
  };
}

/**
 * 제목 블록을 만든다.
 * @param level 제목 단계(1~3)
 * @param label 제목 글자
 * @returns 제목 블록
 */
function heading(level: 1 | 2 | 3, label: string): PostBlock {
  return { type: HEADING_TYPES[level], richText: [text(label)] };
}

/**
 * 코드 블록을 만든다.
 * @param language 언어
 * @param source 코드
 * @returns 코드 블록
 */
function code(language: string, source: string): PostBlock {
  return { type: 'code', language, code: source };
}

/**
 * Notion을 붙이기 전의 임시 글 본문. slug마다 본문 블록(Notion 블록을 단순화한 모양)을 둔다.
 * 목차가 보이는 글(제목 3개 이상)과 아닌 글을 섞고, 다른 글 링크·외부 링크·코드 블록을 넣었다.
 * Notion을 붙이면 이 파일을 지운다.
 * @codocs [[콘텐츠 원천:결정]]
 * @codocs [[Chrome:Notion 블록]]
 */
export const temporaryPostBodies: Readonly<Record<string, readonly PostBlock[]>> = {
  'notion-blog-migration': [
    paragraph(
      '글은 계속 Notion에서 쓰고, 사이트는 바뀐 글만 다시 만든다. 이 글은 옮기면서 정한 것을 모았다.',
    ),
    heading(1, '왜 옮겼나'),
    paragraph(
      '정적 블로그는 글을 고칠 때마다 다시 배포해야 했다. 자세한 갱신 방식은 ',
      link('Next.js on-demand revalidation', '/posts/nextjs-on-demand-revalidation'),
      ' 글에 적었다.',
    ),
    heading(1, '글 데이터베이스'),
    paragraph('제목, slug, 폴더, 작성일, 커버 속성을 둔다.'),
    code('ts', 'const posts = await notion.databases.query({ database_id: DATABASE_ID });'),
    heading(1, '남은 일'),
    paragraph(
      '이미지 주소는 만료되므로 따로 제공한다. Notion API는 ',
      link('공식 문서', 'https://developers.notion.com/'),
      '를 참고했다.',
    ),
  ],
  'react-19-hooks': [
    paragraph(
      'React 19에는 폼과 비동기 상태를 다루는 새 훅이 여럿 들어왔다. 이 글은 use, useActionState, useOptimistic을 예제와 함께 정리한다.',
    ),
    heading(2, 'use 훅'),
    paragraph(
      'use는 Promise와 Context를 렌더링 중에 읽는 새 API다. 자세한 내용은 ',
      link('React 공식 문서', 'https://react.dev/reference/react/use'),
      '를 참고한다.',
    ),
    code('tsx', 'const post = use(fetchPost(slug));\nreturn <Article post={post} />;'),
    heading(2, 'useActionState'),
    paragraph(
      '폼 제출 결과와 대기 상태를 한 번에 다룬다. 이전의 useFormState가 이름을 바꿔 react 패키지로 옮겨 왔다.',
    ),
    code(
      'tsx',
      'const [state, submit, isPending] = useActionState(save, null);\nreturn <form action={submit}>…</form>;',
    ),
    heading(2, 'useOptimistic'),
    paragraph('서버 응답을 기다리지 않고 화면을 먼저 바꾼다. 실패하면 원래 값으로 돌아간다.'),
    heading(2, '마이그레이션'),
    paragraph(
      '서버 컴포넌트와 함께 쓰는 방법은 ',
      link('리액트 서버 컴포넌트 이해하기', 'https://seojaewan.com/posts/react-server-components'),
      '에 정리했다.',
    ),
  ],
  'react-server-components': [
    paragraph('서버 컴포넌트는 서버에서만 렌더링되고, 결과만 브라우저로 보낸다.'),
    heading(2, '경계 나누기'),
    paragraph("상호작용이 필요한 곳에만 'use client'를 붙인다."),
    code(
      'tsx',
      "'use client';\n\nexport function LikeButton() {\n  return <button>좋아요</button>;\n}",
    ),
    paragraph(
      '새 훅과 함께 쓰는 예는 ',
      link('React 19 훅 정리', '/posts/react-19-hooks'),
      '에 있다.',
    ),
  ],
  'nextjs-app-router-cache': [
    paragraph(
      'App Router의 캐시는 요청 메모이제이션, 데이터 캐시, 전체 라우트 캐시, 라우터 캐시 네 겹이다.',
    ),
    heading(2, '데이터 캐시'),
    paragraph('fetch 결과를 요청과 배포를 넘어 기억한다.'),
    code('ts', "const res = await fetch(url, { next: { tags: ['posts'] } });"),
    heading(2, '전체 라우트 캐시'),
    paragraph('정적으로 만든 HTML과 RSC 결과를 기억한다.'),
    heading(3, '언제 비워지나'),
    paragraph(
      '태그로 비우는 방법은 ',
      link('Next.js on-demand revalidation', '/posts/nextjs-on-demand-revalidation'),
      '을 본다. 자세한 표는 ',
      link('Next.js 문서', 'https://nextjs.org/docs/app/guides/caching'),
      '에 있다.',
    ),
  ],
  'react-compiler': [
    paragraph('React Compiler를 켜고 useMemo·useCallback을 지웠다.'),
    code('ts', 'const nextConfig = { reactCompiler: true };'),
    paragraph('측정해 보니 다시 그리는 횟수가 눈에 띄게 줄었다.'),
  ],
  'typescript-5-6': [
    paragraph('TypeScript 5.6에서 눈에 띈 변화를 짧게 적는다.'),
    heading(2, '참·거짓 검사'),
    paragraph('늘 참이거나 늘 거짓인 조건을 오류로 알려 준다.'),
    code('ts', 'if (/regex/) {\n  // 늘 참이라 오류\n}'),
    heading(2, '반복자 도우미'),
    paragraph(
      '반복자에 map·filter 같은 메서드가 생겼다. ',
      link('릴리스 노트', 'https://devblogs.microsoft.com/typescript/'),
    ),
  ],
  'nextjs-on-demand-revalidation': [
    paragraph('Notion 웹훅을 받으면 바뀐 글의 태그만 다시 만든다.'),
    heading(2, '웹훅 라우트'),
    paragraph('서명을 검증한 뒤 revalidateTag를 부른다.'),
    code(
      'ts',
      'export async function POST(request: Request) {\n  revalidateTag(`post:${slug}`);\n}',
    ),
    heading(2, '검증'),
    paragraph('서명이 맞지 않으면 401로 답한다.'),
    heading(2, '놓친 경우'),
    paragraph(
      '다시 배포하면 전체가 새로 만들어진다. 캐시 겹은 ',
      link('Next.js App Router 캐시', '/posts/nextjs-app-router-cache'),
      '에 정리했다.',
    ),
  ],
  'use-effect-dependencies': [
    paragraph('의존성 배열에는 effect가 읽는 반응형 값을 모두 넣는다.'),
    code(
      'tsx',
      'useEffect(() => {\n  connect(roomId);\n  return () => disconnect(roomId);\n}, [roomId]);',
    ),
    paragraph(
      '더 줄이는 방법은 ',
      link('React 문서', 'https://react.dev/learn/removing-effect-dependencies'),
      '에 있다.',
    ),
  ],
  'typescript-generics': [
    paragraph('제네릭은 타입을 매개변수로 받는다.'),
    heading(2, '제약 걸기'),
    code(
      'ts',
      'function first<T extends readonly unknown[]>(items: T): T[number] | undefined {\n  return items[0];\n}',
    ),
    paragraph('제약이 있으면 안에서 그 모양을 쓸 수 있다.'),
  ],
  '2026-first-half-retrospective': [
    paragraph('상반기에는 블로그를 Windows 바탕화면 모양으로 다시 만들기 시작했다.'),
    paragraph(
      '글을 옮긴 이야기는 ',
      link('Notion 블로그 이전기', '/posts/notion-blog-migration'),
      '에 적었다.',
    ),
  ],
};
