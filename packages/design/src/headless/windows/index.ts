/**
 * @file Window headless feature의 Store, model, identity와 읽기 계약을 조합한다.
 *
 * 내부 상태 계산과 ID 발급기, 제품 UI는 이 진입점에서 제공하지 않는다.
 */
export { getWindowBounds, type WindowPlacementConfig } from "./geometry/index.js";
export {
  type ChromeWindowSession,
  type FileExplorerWindowSession,
  type WindowFrameState,
  type WindowMode,
  type WindowPoint,
  type WindowRect,
  type WindowSession,
  type WindowSessionBase,
  type WindowSize,
  type WindowState,
} from "./model/index.js";
export { type NavigationEntry, type NavigationState } from "./navigation/index.js";
export { selectWindowRoute } from "./routeSelector/index.js";
export { type WindowSessionId } from "./windowSessionId/index.js";
export {
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
} from "./windowStore/index.js";
