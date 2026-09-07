/**
 * @file Chrome headless feature의 model과 runtime identity 계약을 조합한다.
 *
 * WindowStore mutation, 주소 parser와 실제 routing은 이 진입점에서 제공하지 않는다.
 */
export {
  type ChromeTabId,
  InvalidChromeTabIdError,
  isChromeTabId,
  parseChromeTabId,
} from "./chromeTabId/index.js";
export { type ChromeLocation, type ChromeTab, type InternalAddress } from "./model/index.js";
