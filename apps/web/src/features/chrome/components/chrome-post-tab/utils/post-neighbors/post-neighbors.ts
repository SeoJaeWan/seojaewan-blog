import {
  isItemInTrash,
  type PostItem,
  type WorkspaceState,
} from '@/shared/utils/workspace-rules/workspace-rules';

/** 글 꼬리의 이전 글·다음 글 */
export type PostNeighbors = {
  /** 이전 글(작성일이 앞선 글). 없으면 undefined */
  previous: PostItem | undefined;
  /** 다음 글(작성일이 뒤인 글). 없으면 undefined */
  next: PostItem | undefined;
};

/**
 * 글의 이전 글과 다음 글을 작성일 기준으로 찾는다. 폴더와 상관없이 사이트의 글을 작성일 오름차순으로 늘어놓고,
 * 작성일이 같으면 제목, 그다음 slug 차례다. 이전 글은 바로 앞(더 오래된 글), 다음 글은 바로 뒤(더 새 글)다.
 * 휴지통에 있는 글은 건너뛴다. 보고 있는 글은 휴지통에 있어도 자기 자리에서 이웃을 찾는다.
 * @codocs [[Chrome:글 화면]]
 * @codocs [[Chrome:휴지통에 있는 글]]
 * @param workspace 작업 공간(글 색인)
 * @param slug 글 slug
 * @returns 이전 글과 다음 글. 색인에 없는 글이면 둘 다 없다
 */
export function getPostNeighbors(
  workspace: Pick<WorkspaceState, 'items'>,
  slug: string,
): PostNeighbors {
  const posts = Object.values(workspace.items)
    .filter(
      (item): item is PostItem =>
        item.kind === 'post' && (item.slug === slug || !isItemInTrash(workspace, item.id)),
    )
    .sort(comparePosts);
  const index = posts.findIndex((post) => post.slug === slug);
  if (index === -1) {
    return { previous: undefined, next: undefined };
  }
  return { previous: posts[index - 1], next: posts[index + 1] };
}

/**
 * 글을 작성일 오름차순(같으면 제목, slug 차례)으로 비교한다.
 * @param left 글
 * @param right 글
 * @returns 정렬 차례
 */
function comparePosts(left: PostItem, right: PostItem): number {
  return (
    left.date.localeCompare(right.date) ||
    left.name.localeCompare(right.name) ||
    left.slug.localeCompare(right.slug)
  );
}
