import type { ContentResourceRef, FolderResourceRef } from "../resources/index.js";
import type { WorkspaceState } from "./model.js";

export type WorkspaceSeed = Readonly<{
  contentInbox: FolderResourceRef;
  content: readonly ContentResourceRef[];
}>;

/** Builds the default Workspace used only when no saved snapshot is available. */
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
