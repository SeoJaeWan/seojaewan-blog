/**
 * 탐색기 창 층 동작 스토리가 쓰는 글 색인. Blog 아래 React 폴더에 글 하나, 그 아래 Hooks 폴더에 글 하나가 놓인다.
 */
export const LAYER_STORY_POSTS = [
  { collection: 'blog', slug: 'a', title: '훅 정리', folderPath: ['React'], date: '2026-10-20' },
  {
    collection: 'blog',
    slug: 'b',
    title: 'useEffect 정리',
    folderPath: ['React', 'Hooks'],
    date: '2026-10-21',
  },
] as const;
