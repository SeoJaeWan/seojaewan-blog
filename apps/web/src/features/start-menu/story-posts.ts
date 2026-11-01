import { waitFor } from 'storybook/test';

import {
  hydrateWorkspaceStore,
  useWorkspaceStore,
} from '@/shared/stores/workspace-store/workspace-store';
import type { PostSummary } from '@/shared/utils/workspace-rules/workspace-rules';

/** 동작 스토리가 쓰는 글 색인. 폴더가 있는 글과 없는 글, 날짜가 다른 글을 섞었다 */
const startStoryPosts: readonly PostSummary[] = [
  { slug: 'react-19-hooks', title: 'React 19 훅 정리', folderPath: ['React'], date: '2026-10-20' },
  {
    slug: 'react-compiler',
    title: 'React Compiler 도입기',
    folderPath: ['React'],
    date: '2026-09-28',
  },
  { slug: 'nextjs-cache', title: 'Next.js 캐시', folderPath: ['Next.js'], date: '2026-10-03' },
  { slug: 'p1', title: '글 하나', folderPath: [], date: '2026-08-01' },
  { slug: 'p2', title: '글 둘', folderPath: [], date: '2026-08-02' },
  { slug: 'p3', title: '글 셋', folderPath: [], date: '2026-08-03' },
  { slug: 'p4', title: '글 넷', folderPath: [], date: '2026-08-04' },
];

/** 글 색인이 저장소에 채워졌는지 본다. 아직이면 오류를 던져 다시 보게 한다. */
function assertPostsHydrated(): void {
  if (useWorkspaceStore.getState().items['post:p1'] === undefined) {
    throw new Error('글 색인이 아직 채워지지 않았다');
  }
}

/** 글 색인을 비운다. 글 색인은 저장소 모듈이 기억하므로 스토리가 끝나면 돌려놓는다. */
function clearPosts(): void {
  hydrateWorkspaceStore([]);
}

/**
 * 동작 스토리가 글 색인으로 작업 공간 저장소를 채운다. 스토리 `beforeEach`에서 `resetStoryStores` 다음에 부른다.
 * @returns 스토리가 끝날 때 부를 정리 함수
 */
export async function hydrateStartStoryPosts(): Promise<() => void> {
  hydrateWorkspaceStore(startStoryPosts);
  await waitFor(assertPostsHydrated);
  return clearPosts;
}
