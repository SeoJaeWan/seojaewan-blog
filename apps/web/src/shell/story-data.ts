// @codocs [[저장소 구성:앱 폴더 구조]]
// 화면 전체 동작 스토리(Features/Shell/Shell)가 서버 대신 넘기는 글 색인이다. 앱의 임시 글 원천과 같은 글 이름을 쓴다.

/** 동작 스토리의 글 색인 */
export const SHELL_STORY_POSTS = [
  {
    slug: 'notion-blog-migration',
    title: 'Notion 블로그 이전기',
    folderPath: [],
    date: '2026-10-24',
  },
  { slug: 'react-19-hooks', title: 'React 19 훅 정리', folderPath: ['React'], date: '2026-10-20' },
  {
    slug: 'react-server-components',
    title: '리액트 서버 컴포넌트 이해하기',
    folderPath: ['React'],
    date: '2026-10-12',
  },
  {
    slug: 'nextjs-app-router-cache',
    title: 'Next.js App Router 캐시',
    folderPath: ['Next.js'],
    date: '2026-10-03',
  },
  {
    slug: 'use-effect-dependencies',
    title: 'useEffect 의존성 배열 다루기',
    folderPath: ['React', 'Hooks'],
    date: '2026-08-30',
  },
  {
    slug: 'typescript-5-6',
    title: 'TypeScript 5.6 새 기능',
    folderPath: ['TypeScript'],
    date: '2026-09-25',
  },
  {
    slug: '2026-first-half-retrospective',
    title: '2026 상반기 회고',
    folderPath: [],
    date: '2026-07-01',
  },
] as const;
