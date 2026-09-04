import type {
  ContentResourceRef,
  Folder,
  FolderResourceRef,
  ResourceId,
  ResourceLookup,
} from "../resources/index.js";
import type { IdGenerator } from "./idGenerator.js";
import type { ResourcePlacement, WorkspaceState } from "./model.js";

export type ReconcileWorkspaceInput = Readonly<{
  state: WorkspaceState;
  currentContent: readonly ContentResourceRef[];
  resourceLookup: ResourceLookup;
  idGenerator: IdGenerator;
}>;

const deduplicateFolders = (folders: readonly Folder[]): Folder[] => {
  const seen = new Set<ResourceId>();

  return folders.filter(({ ref }) => {
    if (seen.has(ref.id)) {
      return false;
    }

    seen.add(ref.id);
    return true;
  });
};

const breakFolderCycles = (placements: readonly ResourcePlacement[]): ResourcePlacement[] => {
  const parentByFolderId = new Map<ResourceId, FolderResourceRef | null>();

  for (const placement of placements) {
    if (placement.resource.kind === "folder") {
      parentByFolderId.set(placement.resource.id, placement.parent);
    }
  }

  const colors = new Map<ResourceId, "active" | "done">();
  const brokenFolderIds = new Set<ResourceId>();

  const visit = (folderId: ResourceId): void => {
    if (colors.has(folderId)) {
      return;
    }

    colors.set(folderId, "active");
    const parent = parentByFolderId.get(folderId) ?? null;

    if (parent !== null) {
      const parentColor = colors.get(parent.id);

      if (parentColor === "active") {
        parentByFolderId.set(folderId, null);
        brokenFolderIds.add(folderId);
      } else if (parentColor !== "done") {
        visit(parent.id);
      }
    }

    colors.set(folderId, "done");
  };

  [...parentByFolderId.keys()].sort().forEach(visit);

  if (brokenFolderIds.size === 0) {
    return [...placements];
  }

  return placements.map((placement) =>
    placement.resource.kind === "folder" && brokenFolderIds.has(placement.resource.id)
      ? { ...placement, parent: null }
      : placement,
  );
};

const assertGeneratedIdIsUnique = (
  id: ResourceId,
  folders: readonly Folder[],
  placements: readonly ResourcePlacement[],
  currentContent: readonly ContentResourceRef[],
): void => {
  if (
    folders.some((folder) => folder.ref.id === id) ||
    placements.some((placement) => placement.resource.id === id) ||
    currentContent.some((content) => content.id === id)
  ) {
    throw new Error(`IdGenerator returned an existing ResourceId: ${id}`);
  }
};

/**
 * Repairs a saved Workspace without applying seed defaults over valid user state.
 * The first valid placement wins duplicates. Missing placements are appended in
 * folder order, then a recovered inbox, then current Content order.
 */
export const reconcileWorkspace = ({
  state,
  currentContent,
  resourceLookup,
  idGenerator,
}: ReconcileWorkspaceInput): WorkspaceState => {
  const folders = deduplicateFolders(state.folders);
  const folderIds = new Set(folders.map((folder) => folder.ref.id));
  const seenResourceIds = new Set<ResourceId>();

  let placements = state.placements.flatMap((placement) => {
    const { resource } = placement;

    if (seenResourceIds.has(resource.id)) {
      return [];
    }

    if (resource.kind === "folder") {
      if (!folderIds.has(resource.id)) {
        return [];
      }
    } else if (!resourceLookup.hasResource(resource)) {
      return [];
    }

    seenResourceIds.add(resource.id);

    const parent =
      placement.parent === null || folderIds.has(placement.parent.id) ? placement.parent : null;

    return [{ ...placement, parent: parent?.id === resource.id ? null : parent }];
  });

  for (const folder of folders) {
    if (!seenResourceIds.has(folder.ref.id)) {
      seenResourceIds.add(folder.ref.id);
      placements.push({ resource: folder.ref, parent: null });
    }
  }

  placements = breakFolderCycles(placements);

  let contentInbox = state.contentInbox;
  if (!folderIds.has(contentInbox.id)) {
    const id = idGenerator.generateId();
    assertGeneratedIdIsUnique(id, folders, placements, currentContent);

    contentInbox = { kind: "folder", id };
    folders.push({ ref: contentInbox, name: "Blog" });
    folderIds.add(id);
    seenResourceIds.add(id);
    placements.push({ resource: contentInbox, parent: null });
  }

  for (const content of currentContent) {
    if (!seenResourceIds.has(content.id) && resourceLookup.hasResource(content)) {
      seenResourceIds.add(content.id);
      placements.push({ resource: content, parent: contentInbox });
    }
  }

  return {
    schemaVersion: 1,
    contentInbox,
    folders,
    placements,
  };
};
