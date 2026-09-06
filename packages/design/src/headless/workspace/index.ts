/**
 * @file Workspace feature의 public 계약과 구현을 한 진입점으로 다시 내보낸다.
 *
 * 새로운 domain 동작을 구현하지 않고 하위 module의 public surface만 조합한다.
 */
export { FolderCatalog } from "./folderCatalog/index.js";
export { type ResourcePlacement, type WorkspaceState } from "./model/index.js";
export { createWorkspaceSeed, type WorkspaceSeed } from "./seed/index.js";
export {
  WorkspaceStore,
  WorkspaceStoreAlreadyInitializedError,
  type WorkspaceStoreInitialization,
  WorkspaceStoreNotInitializedError,
  type WorkspaceStorePersistenceFailure,
  type WorkspaceStoreResult,
} from "./workspaceStore/index.js";
export {
  type WorkspaceOperationFailureReason,
  type WorkspaceOperationResult,
} from "./workspaceStore/operationResult/index.js";
export { type WorkspaceStorage } from "./workspaceStore/workspaceStorage/index.js";
