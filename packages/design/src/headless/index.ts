/**
 * @file DOM·Base UI와 분리된 design headless public surface를 조합한다.
 *
 * Resource, Start, Taskbar, Workspace와 Window feature의 구현 책임은 각각의 feature에 남겨 둔다.
 */
export {
  type ChromeLocation,
  type ChromeTab,
  type ChromeTabId,
  type InternalAddress,
} from "./chrome/index.js";
export {
  type FileExplorerLocation,
  type FileExplorerTab,
  type FileExplorerTabId,
} from "./folders/index.js";
export * from "./resources/index.js";
export * from "./runtime/index.js";
export * from "./start/index.js";
export * from "./taskbar/index.js";
export {
  type ChromeWindowSession,
  type FileExplorerWindowSession,
  getWindowBounds,
  type NavigationEntry,
  type NavigationState,
  selectWindowRoute,
  useWindowController,
  type WindowAction,
  type WindowApplicationId,
  type WindowCommittedResult,
  type WindowController,
  type WindowControllerActions,
  type WindowControllerViewModel,
  type WindowFrameState,
  type WindowMode,
  type WindowOperationHandle,
  WindowOperations,
  type WindowOperationsOptions,
  type WindowOperationStore,
  type WindowPlacementConfig,
  type WindowPoint,
  type WindowPresentedResult,
  type WindowRect,
  type WindowSession,
  type WindowSessionBase,
  type WindowSessionId,
  type WindowSettledResult,
  type WindowSize,
  type WindowState,
  WindowStore,
  WindowStoreAlreadyInitializedError,
  type WindowStoreChange,
  type WindowStoreChangeKind,
  type WindowStoreCommittedResult,
  type WindowStoreFailureReason,
  type WindowStoreInitialization,
  type WindowStoreNoOpResult,
  WindowStoreNotInitializedError,
  type WindowStoreRejectedResult,
  type WindowStoreResult,
  type WindowWorkspaceReader,
} from "./windows/index.js";
export * from "./workspace/index.js";
