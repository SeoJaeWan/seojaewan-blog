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
  /**
   * open 명령이 새 WindowSession과 첫 tab을 만들고 active·topmost로 반영했다.
   */
  | "window-created"
  /**
   * activate 또는 기존 대상 재사용이 Session을 복원해 active·topmost로 반영했다.
   */
  | "window-activated"
  /**
   * desktop minimize가 Session identity와 stacking 위치를 유지한 채 창을 숨겼다.
   */
  | "window-minimized"
  /**
   * close가 Session을 제거하고 필요하면 다음 visible Session을 active로 선택했다.
   */
  | "window-closed"
  /**
   * toggleMaximize가 desktop Session의 placement를 maximized로 바꿨다.
   */
  | "window-maximized"
  /**
   * toggleMaximize가 maximized Session의 placement를 저장된 normal 상태로 되돌렸다.
   */
  | "window-restored"
  /**
   * desktop move가 제한된 새 normalBounds 위치를 Session에 반영했다.
   */
  | "window-moved"
  /**
   * desktop resize가 최소 크기와 workArea에 맞춘 새 normalBounds 크기를 반영했다.
   */
  | "window-resized"
  /**
   * gesture 취소가 시작 시점의 bounds·placement·minimized 값을 한 commit으로 복구했다.
   */
  | "window-frame-restored"
  /**
   * setWorkArea가 새 측정 영역과 필요한 desktop frame 보정을 한 commit으로 반영했다.
   */
  | "work-area-changed"
  /**
   * setMode가 responsive mode와 해당 cardinality 전환을 한 commit으로 반영했다.
   */
  | "mode-changed"
  /**
   * mobile launcher가 빈 화면 또는 다른 앱의 창을 선택한 application의 기본 창으로 교체했다.
   */
  | "mobile-application-launched"
  /**
   * mobile Chrome의 명시적 close가 복귀 location을 가진 File Explorer 창으로 교체했다.
   */
  | "mobile-returned-to-file-explorer"
  /**
   * desktop add-tab 명령이 새 tab을 추가하고 그 tab과 Window를 active로 반영했다.
   */
  | "tab-added"
  /**
   * tab 선택 명령이 같은 application Session 안의 다른 기존 tab을 active로 반영했다.
   */
  | "tab-activated"
  /**
   * close-tab 명령이 대상 tab을 제거하거나, mobile 복귀 교체가 필요 없는 마지막 tab의 Window를 닫았다.
   */
  | "tab-closed"
  /**
   * 직접 탐색 또는 Content open이 tab history에 새 location을 반영했다.
   */
  | "tab-navigated"
  /**
   * back 명령이 Explorer 또는 Chrome tab의 이전 history entry와 scroll 위치를 복원했다.
   */
  | "tab-went-back"
  /**
   * forward 명령이 Explorer 또는 Chrome tab의 다음 history entry와 scroll 위치를 복원했다.
   */
  | "tab-went-forward"
  /**
   * scroll 명령이 현재 history entry에 달라진 유효 scrollTop을 반영했다.
   */
  | "tab-scrolled"
  /**
   * Explorer 또는 Chrome refresh가 제품별 화면 상태를 새 history 없이 갱신했다.
   */
  | "tab-refreshed"
  /** Explorer tab-local 검색어가 바뀌었다. */
  | "tab-query-changed"
  /** Explorer tab-local Sidebar expansion set이 바뀌었다. */
  | "tab-expansion-changed"
  /** Explorer tab-local Content selection이 바뀌었다. */
  | "tab-selection-changed"
  /** Explorer Window가 공유하는 Sidebar runtime 폭이 바뀌었다. */
  | "sidebar-width-changed";

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
  /**
   * SessionId 형식이 유효하지 않거나 현재 snapshot에 해당 Session이 없어 명령을 거절했다.
   */
  | "session-not-found"
  /**
   * Explorer 또는 Chrome 전용 명령의 Session이 요청한 application kind와 달라 거절했다.
   */
  | "session-kind-mismatch"
  /**
   * 대상 tab이 지정한 Session의 현재 tab 목록에 없어 명령을 거절했다.
   */
  | "tab-not-found"
  /**
   * Explorer와 Chrome 중 다른 application 형식의 TabId가 전용 명령에 전달되어 거절했다.
   */
  | "tab-kind-mismatch"
  /**
   * Explorer location의 Folder ref가 현재 Workspace에 없어 open 또는 navigate를 거절했다.
   */
  | "folder-not-found"
  /**
   * Chrome location의 Content ref가 현재 Catalog에 없어 open 또는 navigate를 거절했다.
   */
  | "content-not-found"
  /**
   * ResourceRef를 파싱할 수 없거나 명령이 요구한 Resource kind와 달라 거절했다.
   */
  | "invalid-resource-ref"
  /**
   * Chrome location의 discriminant, 필드 수, 주소 또는 값 구조가 계약과 달라 거절했다.
   */
  | "invalid-location"
  /** Explorer target wrapper 또는 unresolved path 문자열이 계약과 달라 거절했다. */
  | "invalid-explorer-target"
  /** Explorer query가 문자열이 아니어서 거절했다. */
  | "invalid-query"
  /** Explorer expanded Folder ID 목록이 배열 또는 ResourceId 형식이 아니어서 거절했다. */
  | "invalid-expanded-folder-ids"
  /** Explorer selection이 ResourceRef 배열 형식이 아니어서 거절했다. */
  | "invalid-selection"
  /** Explorer Sidebar 폭이 유한한 양수가 아니어서 거절했다. */
  | "invalid-sidebar-width"
  /**
   * setMode에 desktop 또는 mobile 이외의 값이 runtime 입력으로 전달되어 거절했다.
   */
  | "invalid-mode"
  /**
   * mobile launcher에 file-explorer 또는 chrome 이외의 application identity가 전달되어 거절했다.
   */
  | "invalid-application"
  /**
   * mobile 전용 application launcher가 desktop mode에서 호출되어 거절했다.
   */
  | "mobile-mode-required"
  /**
   * scrollTop이 유한한 0 이상 숫자가 아니어서 tab scroll 변경을 거절했다.
   */
  | "invalid-scroll-top"
  /**
   * workArea, 위치, 크기 또는 placement 설정이 geometry의 유한성·크기 전제를 위반해 거절했다.
   */
  | "invalid-geometry"
  /**
   * 발급된 runtime UUID가 유효하지 않거나 기존 Session·후보·Resource identity와 충돌해 생성을 거절했다.
   */
  | "duplicate-runtime-id"
  /**
   * 실행 환경에서 crypto.randomUUID를 사용할 수 없어 새 Session 또는 tab 생성을 거절했다.
   */
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
  /**
   * 명령이 WindowState를 교체하고 subscriber 알림까지 마친 semantic commit 결과다.
   */
  | WindowStoreCommittedResult
  /**
   * 유효한 명령이 현재 상태와 같거나 mobile에서 지원하지 않아 commit과 알림을 생략한 결과다.
   */
  | WindowStoreNoOpResult
  /**
   * 입력 또는 현재 Session·tab·Resource 전제가 맞지 않아 snapshot을 유지한 실패 결과다.
   */
  | WindowStoreRejectedResult;
