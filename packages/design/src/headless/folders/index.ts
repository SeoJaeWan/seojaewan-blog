/**
 * @file File Explorer headless feature의 model과 runtime identity 계약을 조합한다.
 *
 * WindowStore mutation과 제품 UI는 이 진입점에서 제공하지 않는다.
 */
export {
  type FileExplorerTabId,
  InvalidFileExplorerTabIdError,
  isFileExplorerTabId,
  parseFileExplorerTabId,
} from "./fileExplorerTabId/index.js";
export { type FileExplorerLocation, type FileExplorerTab } from "./model/index.js";
