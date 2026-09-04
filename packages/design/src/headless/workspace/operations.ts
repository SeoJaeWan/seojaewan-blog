import type { FolderResourceRef, ResourceId, ResourceRef } from "../resources/index.js";
import type { IdGenerator } from "./idGenerator.js";
import type { ResourcePlacement, WorkspaceState } from "./model.js";

export type WorkspaceOperationFailureReason =
  | "duplicate-resource-id"
  | "folder-cycle"
  | "folder-not-found"
  | "no-op"
  | "parent-folder-not-found"
  | "resource-not-found"
  | "resource-placement-not-unique"
  | "self-parent";

export type WorkspaceOperationResult =
  | Readonly<{ ok: true; value: WorkspaceState }>
  | Readonly<{ ok: false; reason: WorkspaceOperationFailureReason }>;

const failure = (reason: WorkspaceOperationFailureReason): WorkspaceOperationResult => ({
  ok: false,
  reason,
});

const hasFolder = (state: WorkspaceState, id: ResourceId): boolean =>
  state.folders.some((folder) => folder.ref.id === id);

const sameParent = (left: FolderResourceRef | null, right: FolderResourceRef | null): boolean =>
  left?.id === right?.id && (left === null) === (right === null);

const hasResourceId = (state: WorkspaceState, id: ResourceId): boolean =>
  state.folders.some((folder) => folder.ref.id === id) ||
  state.placements.some((placement) => placement.resource.id === id);

export const createFolder = (
  state: WorkspaceState,
  name: string,
  parent: FolderResourceRef | null,
  idGenerator: IdGenerator,
): WorkspaceOperationResult => {
  if (parent !== null && !hasFolder(state, parent.id)) {
    return failure("parent-folder-not-found");
  }

  const id = idGenerator.generateId();
  if (hasResourceId(state, id)) {
    return failure("duplicate-resource-id");
  }

  const ref: FolderResourceRef = { kind: "folder", id };

  return {
    ok: true,
    value: {
      ...state,
      folders: [...state.folders, { ref, name }],
      placements: [...state.placements, { resource: ref, parent }],
    },
  };
};

export const renameFolder = (
  state: WorkspaceState,
  folder: FolderResourceRef,
  name: string,
): WorkspaceOperationResult => {
  const folderIndex = state.folders.findIndex(({ ref }) => ref.id === folder.id);
  if (folderIndex === -1) {
    return failure("folder-not-found");
  }

  if (state.folders[folderIndex]?.name === name) {
    return failure("no-op");
  }

  return {
    ok: true,
    value: {
      ...state,
      folders: state.folders.map((current, index) =>
        index === folderIndex ? { ...current, name } : current,
      ),
    },
  };
};

const wouldCreateFolderCycle = (
  placements: readonly ResourcePlacement[],
  resource: FolderResourceRef,
  parent: FolderResourceRef,
): boolean => {
  const parentByFolderId = new Map<ResourceId, FolderResourceRef | null>();

  for (const placement of placements) {
    if (placement.resource.kind === "folder") {
      parentByFolderId.set(placement.resource.id, placement.parent);
    }
  }

  parentByFolderId.set(resource.id, parent);

  const visited = new Set<ResourceId>();
  let cursor: FolderResourceRef | null = parent;

  while (cursor !== null) {
    if (cursor.id === resource.id) {
      return true;
    }

    if (visited.has(cursor.id)) {
      return true;
    }

    visited.add(cursor.id);
    cursor = parentByFolderId.get(cursor.id) ?? null;
  }

  return false;
};

export const moveResource = (
  state: WorkspaceState,
  resource: ResourceRef,
  parent: FolderResourceRef | null,
): WorkspaceOperationResult => {
  if (parent !== null && !hasFolder(state, parent.id)) {
    return failure("parent-folder-not-found");
  }

  if (resource.kind === "folder" && !hasFolder(state, resource.id)) {
    return failure("resource-not-found");
  }

  const matchingPlacementIndexes = state.placements.flatMap((placement, index) =>
    placement.resource.id === resource.id ? [index] : [],
  );

  if (matchingPlacementIndexes.length === 0) {
    return failure("resource-not-found");
  }

  if (matchingPlacementIndexes.length > 1) {
    return failure("resource-placement-not-unique");
  }

  const placementIndex = matchingPlacementIndexes[0];
  const placement = state.placements[placementIndex];
  if (placement === undefined) {
    return failure("resource-not-found");
  }

  if (sameParent(placement.parent, parent)) {
    return failure("no-op");
  }

  if (resource.kind === "folder" && parent?.id === resource.id) {
    return failure("self-parent");
  }

  if (
    resource.kind === "folder" &&
    parent !== null &&
    wouldCreateFolderCycle(state.placements, resource, parent)
  ) {
    return failure("folder-cycle");
  }

  return {
    ok: true,
    value: {
      ...state,
      placements: state.placements.map((current, index) =>
        index === placementIndex ? { ...current, parent } : current,
      ),
    },
  };
};
