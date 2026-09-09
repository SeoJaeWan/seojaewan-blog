/**
 * @file 저장된 상태가 없을 때 사용할 최초 Workspace snapshot을 만든다.
 *
 * 기존 snapshot 복구와 persistence는 이 파일의 책임이 아니다.
 */
import type { ContentResourceRef, FolderResourceRef } from "../../resources/index.js";
import type { WorkspaceState } from "../model/index.js";

/**
 * 저장된 Workspace가 없을 때 최초 snapshot을 만들기 위한 고정 입력을 나타낸다.
 *
 * 기존 사용자 상태의 갱신에는 사용하지 않으며, 배포 후 변경된 Content 반영은 reconcile이 담당한다.
 */
export type WorkspaceSeed = Readonly<{
  contentInbox: FolderResourceRef;
  content: readonly ContentResourceRef[];
}>;

/**
 * Desktop의 Blog Folder와 초기 Content placement를 가진 기본 Workspace를 만든다.
 *
 * 저장된 snapshot을 덮어쓰거나 stale Resource를 정리하지 않으며, 그 경우에는 `reconcileWorkspace`를 사용한다.
 */
export const createWorkspaceSeed = ({ contentInbox, content }: WorkspaceSeed): WorkspaceState => {
  const seenContentIds = new Set<string>();
  const uniqueContent = content.filter(({ id }) => {
    if (seenContentIds.has(id)) {
      return false;
    }

    seenContentIds.add(id);
    return true;
  });

  return {
    schemaVersion: 1,
    contentInbox,
    folders: [{ ref: contentInbox, name: "Blog" }],
    placements: [
      { resource: contentInbox, parent: null },
      ...uniqueContent.map((resource) => ({ resource, parent: contentInbox })),
    ],
  };
};
