import 'server-only';

import type { PostRow } from '@/content/post-schema/post-schema';

/**
 * Notion을 붙이기 전의 임시 글 원천. Notion 글 데이터베이스의 속성(제목, slug, 폴더, 작성일, 커버)과 같은 모양이다.
 * 글 이름과 폴더는 피그마 조립(탐색기, Start, 검색)의 글을 따른다. Notion을 붙이면 이 파일을 지운다.
 * @codocs [[콘텐츠 원천:Notion 속성]]
 */
export const temporaryPostRows = [
  {
    title: 'Notion 블로그 이전기',
    slug: 'notion-blog-migration',
    folder: '',
    publishedAt: '2026-10-24',
    cover: null,
  },
  {
    title: 'React 19 훅 정리',
    slug: 'react-19-hooks',
    folder: 'React',
    publishedAt: '2026-10-20',
    cover: null,
  },
  {
    title: '리액트 서버 컴포넌트 이해하기',
    slug: 'react-server-components',
    folder: 'React',
    publishedAt: '2026-10-12',
    cover: null,
  },
  {
    title: 'Next.js App Router 캐시',
    slug: 'nextjs-app-router-cache',
    folder: 'Next.js',
    publishedAt: '2026-10-03',
    cover: null,
  },
  {
    title: 'React Compiler 도입기',
    slug: 'react-compiler',
    folder: 'React',
    publishedAt: '2026-09-28',
    cover: null,
  },
  {
    title: 'TypeScript 5.6 새 기능',
    slug: 'typescript-5-6',
    folder: 'TypeScript',
    publishedAt: '2026-09-25',
    cover: null,
  },
  {
    title: 'Next.js on-demand revalidation',
    slug: 'nextjs-on-demand-revalidation',
    folder: 'Next.js',
    publishedAt: '2026-09-05',
    cover: null,
  },
  {
    title: 'useEffect 의존성 배열 다루기',
    slug: 'use-effect-dependencies',
    folder: 'React/Hooks',
    publishedAt: '2026-08-30',
    cover: null,
  },
  {
    title: 'TypeScript 제네릭 활용',
    slug: 'typescript-generics',
    folder: 'TypeScript',
    publishedAt: '2026-08-14',
    cover: null,
  },
  {
    title: '2026 상반기 회고',
    slug: '2026-first-half-retrospective',
    folder: '',
    publishedAt: '2026-07-01',
    cover: null,
  },
] as const satisfies readonly PostRow[];
