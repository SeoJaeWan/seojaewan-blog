// @codocs [[저장소 구성:앱 폴더 구조]]
// 작업 표시줄 앱 버튼 동작 스토리가 쓰는 글 색인이다. Chrome 점프 목록("자주 방문")이 최신 글 6개만 보이는지 보려고
// Blog 글 7개와 최신순으로 앞서는 Project 항목 하나를 둔다.
import type { PostSummary } from '@/shared/utils/workspace-rules/workspace-rules';

export const taskbarStoryPosts: readonly PostSummary[] = [
  { collection: 'blog', slug: 'p1', title: '글 하나', folderPath: [], date: '2026-10-01' },
  { collection: 'blog', slug: 'p2', title: '글 둘', folderPath: [], date: '2026-10-02' },
  { collection: 'blog', slug: 'p3', title: '글 셋', folderPath: [], date: '2026-10-03' },
  { collection: 'blog', slug: 'p4', title: '글 넷', folderPath: [], date: '2026-10-04' },
  { collection: 'blog', slug: 'p5', title: '글 다섯', folderPath: [], date: '2026-10-05' },
  { collection: 'blog', slug: 'p6', title: '글 여섯', folderPath: [], date: '2026-10-06' },
  { collection: 'blog', slug: 'p7', title: '글 일곱', folderPath: [], date: '2026-10-07' },
  { collection: 'project', slug: 'site', title: '프로젝트', folderPath: [], date: '2026-10-08' },
];
