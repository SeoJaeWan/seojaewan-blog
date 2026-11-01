/**
 * 탐색기 본문 동작 스토리가 쓰는 글 색인. Blog 아래에 폴더 둘(React, Next.js)과 글 하나(회고)가 놓인다.
 */
export const BODY_STORY_POSTS = [
  { slug: 'a', title: '훅 정리', folderPath: ['React'], date: '2026-10-20' },
  { slug: 'b', title: '회고', folderPath: [], date: '2026-10-21' },
  { slug: 'c', title: '캐시', folderPath: ['Next.js'], date: '2026-10-22' },
] as const;
