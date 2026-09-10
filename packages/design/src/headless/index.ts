/**
 * @file DOM·Base UI와 분리된 design headless public surface를 조합한다.
 *
 * Resource, Start, Taskbar, Workspace와 Window feature의 구현 책임은 각각의 feature에 남겨 둔다.
 */
import type { ExplorerNavigationTarget } from "./folders/index.js";
import type { WorkspacePathResolution } from "./workspace/index.js";

export {
  type ChromeLocation,
  type ChromeTab,
  type ChromeTabId,
  type InternalAddress,
} from "./chrome/index.js";
export {
  areFolderViewSettingsEqual,
  areFolderViewSettingsLocationsEqual,
  createFolderViewSettingsStorageSnapshot,
  DEFAULT_FOLDER_VIEW_SETTINGS,
  type ExplorerNavigationTarget,
  type FileExplorerNavigationValue,
  type FileExplorerLocation,
  type FileExplorerTab,
  type FileExplorerTabId,
  type FolderDetailsColumnWidths,
  type FolderViewMode,
  type FolderViewSettings,
  type FolderViewSettingsAction,
  type FolderViewSettingsChange,
  type FolderViewSettingsSnapshot,
  type FolderViewSettingsStorage,
  type FolderViewSettingsStorageEntry,
  type FolderViewSettingsStorageSnapshot,
  type FolderViewSettingsStoreCommandContext,
  type FolderViewSettingsStoreCommittedResult,
  type FolderViewSettingsStoreInitialization,
  type FolderViewSettingsStoreNoOpResult,
  type FolderViewSettingsStorePersistenceFailure,
  type FolderViewSettingsStoreRejectedResult,
  type FolderViewSettingsStoreRejectionReason,
  type FolderViewSettingsStoreResult,
  FolderViewSettingsStore,
  FolderViewSettingsStoreAlreadyInitializedError,
  FolderViewSettingsStoreNotInitializedError,
  type FolderViewSettingsSurface,
  type FolderViewSortDirection,
  type FolderViewSortKey,
  type ParsedFolderViewSettingsStorageSnapshot,
  parseFolderViewSettings,
  parseFolderViewSettingsLocation,
  parseFolderViewSettingsStorageSnapshot,
} from "./folders/index.js";
export * from "./resources/index.js";
export * from "./runtime/index.js";
export * from "./start/index.js";
export * from "./taskbar/index.js";
export {
  type ChromeWindowSession,
  DEFAULT_FILE_EXPLORER_SIDEBAR_WIDTH,
  type FileExplorerWindowSession,
  getWindowBounds,
  type NavigationEntry,
  type NavigationState,
  resizeWindowBounds,
  selectWindowRoute,
  useWindowController,
  type WindowAction,
  type WindowApplicationId,
  type WindowCommittedResult,
  type WindowController,
  type WindowControllerActions,
  type WindowControllerViewModel,
  type WindowFrameState,
  type WindowGestureCancelResult,
  type WindowGestureFinishResult,
  type WindowGestureHandle,
  type WindowGestureKind,
  type WindowGestureRequest,
  WindowGestures,
  type WindowGestureStartResult,
  type WindowGestureStore,
  type WindowGestureUpdateResult,
  type WindowMode,
  type WindowOperationHandle,
  WindowOperations,
  type WindowOperationsOptions,
  type WindowOperationStore,
  type WindowPlacementConfig,
  type WindowPoint,
  type WindowPresentationPort,
  type WindowPresentationRequest,
  type WindowPresentedResult,
  type WindowRect,
  type WindowResizeDirection,
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
  type WindowStoreCommandContext,
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

/** Workspace path 해석 결과를 Window가 소비하는 Explorer target으로 손실 없이 변환한다. */
export const toExplorerNavigationTarget = (
  resolution: WorkspacePathResolution,
): ExplorerNavigationTarget =>
  resolution.type === "location"
    ? Object.freeze({ kind: "location", location: resolution.location })
    : Object.freeze({ kind: "unresolved-path", path: resolution.path });
