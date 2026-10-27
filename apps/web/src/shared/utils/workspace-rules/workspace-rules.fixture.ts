import type { WorkspaceCatalog } from './workspace-rules';

/** 규칙 테스트의 외부 링크(GitHub) 설정 */
export const GITHUB_LINK = {
  id: 'github',
  name: 'GitHub',
  url: 'https://github.com/SeoJaeWan',
  icon: 'illustrations/file-link.svg',
  initialParentId: null,
  pinnedToStart: true,
} as const;

/** 규칙 테스트의 글 색인과 외부 링크 설정 */
export const testCatalog = {
  posts: [
    {
      slug: 'react-19-hooks',
      title: 'React 19 훅 정리',
      folderPath: ['React'],
      date: '2026-10-20',
    },
    {
      slug: 'use-effect',
      title: 'useEffect 정리',
      folderPath: ['React', 'Hooks'],
      date: '2026-08-30',
    },
    { slug: 'nextjs-cache', title: 'Next.js 캐시', folderPath: ['Next.js'], date: '2026-10-03' },
    { slug: 'retrospective', title: '2026 상반기 회고', folderPath: [], date: '2026-07-01' },
  ],
  links: [
    GITHUB_LINK,
    {
      id: 'side',
      name: '사이드 프로젝트',
      url: 'https://example.com/side',
      icon: 'illustrations/file-link.svg',
      initialParentId: 'blog',
      pinnedToStart: false,
    },
  ],
} as const satisfies WorkspaceCatalog;

/** 테스트에서 쓰는 지금 시각 */
export const NOW = '2026-10-28T09:00:00.000Z';
