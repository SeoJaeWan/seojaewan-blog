/**
 * @file WindowStore 명령의 semantic commit, no-op과 거절 결과를 정의한다.
 *
 * animation, router와 UI presentation 완료 상태는 이 결과에 포함하지 않는다.
 */
import type { ChromeTabId } from "../../../chrome/index.js";
import type { FileExplorerTabId } from "../../../folders/index.js";
import type { WindowState } from "../../model/index.js";
import type { WindowSessionId } from "../../windowSessionId/index.js";

/**
 * WindowStore가 한 번의 commit으로 반영한 제품 상태 변경 종류다.
 */
export type WindowStoreChangeKind =
  | "window-created"
  | "window-activated"
  | "window-minimized"
  | "window-closed"
  | "window-maximized"
  | "window-restored"
  | "window-moved"
  | "window-resized"
  | "work-area-changed"
  | "mode-changed"
  | "mobile-returned-to-file-explorer"
  | "tab-added"
  | "tab-activated"
  | "tab-closed"
  | "tab-navigated"
  | "tab-went-back"
  | "tab-went-forward"
  | "tab-scrolled"
  | "tab-refreshed";

/**
 * commit을 식별하는 종류와 영향을 받은 runtime identity다.
 */
export type WindowStoreChange = Readonly<{
  kind: WindowStoreChangeKind;
  sessionId?: WindowSessionId;
  tabId?: FileExplorerTabId | ChromeTabId;
}>;

/**
 * 명령이 snapshot을 교체하고 subscriber 알림까지 마친 결과다.
 */
export type WindowStoreCommittedResult = Readonly<{
  ok: true;
  changed: true;
  change: WindowStoreChange;
  value: WindowState;
}>;

/**
 * 요청이 이미 만족되어 commit과 subscriber 알림을 생략한 결과다.
 */
export type WindowStoreNoOpResult = Readonly<{
  ok: true;
  changed: false;
  reason: "no-op";
  value: WindowState;
}>;

/**
 * 입력이나 현재 상태가 명령의 전제와 맞지 않아 변경하지 않은 이유다.
 */
export type WindowStoreFailureReason =
  | "session-not-found"
  | "session-kind-mismatch"
  | "tab-not-found"
  | "tab-kind-mismatch"
  | "folder-not-found"
  | "content-not-found"
  | "invalid-resource-ref"
  | "invalid-location"
  | "invalid-mode"
  | "invalid-scroll-top"
  | "invalid-geometry"
  | "duplicate-runtime-id"
  | "runtime-id-unavailable";

/**
 * 명령 전제 검증에 실패해 기존 snapshot과 알림 수를 유지한 결과다.
 */
export type WindowStoreRejectedResult = Readonly<{
  ok: false;
  changed: false;
  reason: WindowStoreFailureReason;
}>;

/**
 * WindowStore 명령의 commit, no-op 또는 변경 없는 거절 결과다.
 */
export type WindowStoreResult =
  WindowStoreCommittedResult | WindowStoreNoOpResult | WindowStoreRejectedResult;
