import type { Folder, FolderResourceRef, ResourceRef } from "../resources/index.js";

export type ResourcePlacement = Readonly<{
  resource: ResourceRef;
  parent: FolderResourceRef | null;
}>;

export type WorkspaceState = Readonly<{
  schemaVersion: 1;
  contentInbox: FolderResourceRef;
  folders: readonly Folder[];
  placements: readonly ResourcePlacement[];
}>;
