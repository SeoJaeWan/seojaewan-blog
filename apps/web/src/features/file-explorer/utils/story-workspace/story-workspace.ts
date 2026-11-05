import { waitFor } from 'storybook/test';

import {
  hydrateWorkspaceStore,
  useWorkspaceStore,
} from '@/shared/stores/workspace-store/workspace-store';

/** 스토리용 글 하나 */
type StoryPost = {
  slug: string;
  title: string;
  folderPath: readonly string[];
  date: string;
};

/**
 * 동작 스토리가 쓸 글 색인으로 작업 공간 저장소를 채우고 채워질 때까지 기다린다. 스토리 meta의 `beforeEach`에서 `resetStoryStores` 뒤에 부른다.
 * @param posts 글 색인
 * @codocs [[테스트 작성 규칙:스토리 테스트]]
 */
export async function hydrateStoryWorkspace(posts: readonly StoryPost[]): Promise<void> {
  hydrateWorkspaceStore(posts);
  const firstId = `post:${posts[0]?.slug ?? ''}`;
  await waitFor(
    /** 첫 글이 저장소에 들어올 때까지 기다린다. */
    () => {
      if (useWorkspaceStore.getState().items[firstId] === undefined) {
        throw new Error('작업 공간이 아직 채워지지 않았다');
      }
    },
  );
}
