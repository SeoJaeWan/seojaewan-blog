import type { Folder, ResourceId } from "../resources/index.js";
import { WorkspaceStore } from "./workspaceStore.js";

/** Static live view over the Folder originals owned by WorkspaceStore. */
export class FolderCatalog {
  private constructor() {}

  static has(id: ResourceId): boolean {
    return WorkspaceStore.getSnapshot().folders.some((folder) => folder.ref.id === id);
  }

  static get(id: ResourceId): Folder | undefined {
    return WorkspaceStore.getSnapshot().folders.find((folder) => folder.ref.id === id);
  }

  static list(): readonly Folder[] {
    return WorkspaceStore.getSnapshot().folders;
  }
}
