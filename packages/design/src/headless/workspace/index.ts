export { FolderCatalog } from "./folderCatalog.js";
export { type IdGenerator } from "./idGenerator.js";
export { type ResourcePlacement, type WorkspaceState } from "./model.js";
export {
  createFolder,
  moveResource,
  renameFolder,
  type WorkspaceOperationFailureReason,
  type WorkspaceOperationResult,
} from "./operations.js";
export { reconcileWorkspace, type ReconcileWorkspaceInput } from "./reconcileWorkspace.js";
export { createWorkspaceSeed, type WorkspaceSeed } from "./seed.js";
export { type WorkspaceStorage } from "./workspaceStorage.js";
export {
  WorkspaceStore,
  WorkspaceStoreAlreadyInitializedError,
  type WorkspaceStoreInitialization,
  WorkspaceStoreNotInitializedError,
  type WorkspaceStorePersistenceFailure,
  type WorkspaceStoreResult,
} from "./workspaceStore.js";
