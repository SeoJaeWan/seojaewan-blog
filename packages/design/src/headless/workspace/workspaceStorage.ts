import type { WorkspaceState } from "./model.js";

/** Application-owned persistence boundary for complete Workspace snapshots. */
export type WorkspaceStorage = Readonly<{
  load(): Promise<unknown>;
  save(snapshot: WorkspaceState): Promise<void>;
}>;
