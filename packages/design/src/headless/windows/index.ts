/**
 * @file Window headless feature의 model, identity와 순수 geometry 계약을 조합한다.
 *
 * WindowStore mutation과 제품 UI는 이 진입점에서 제공하지 않는다.
 */
export {
  constrainWindowBounds,
  createWindowBounds,
  getWindowBounds,
  InvalidWindowGeometryError,
  recoverWindowBounds,
  type WindowPlacementConfig,
} from "./geometry/index.js";
export {
  type ChromeWindowSession,
  type FileExplorerWindowSession,
  type WindowBounds,
  type WindowFrameState,
  type WindowPoint,
  type WindowRect,
  type WindowSession,
  type WindowSessionBase,
  type WindowSize,
  type WindowState,
} from "./model/index.js";
export { type NavigationEntry, type NavigationState } from "./navigation/index.js";
export {
  InvalidWindowSessionIdError,
  isWindowSessionId,
  parseWindowSessionId,
  type WindowSessionId,
} from "./windowSessionId/index.js";
