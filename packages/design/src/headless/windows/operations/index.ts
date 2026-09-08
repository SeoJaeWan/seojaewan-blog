/**
 * @file Window·tab·navigation Action을 Session queue, Store commit과 transition에 연결한다.
 *
 * Window 상태 계산과 ID 발급은 WindowStore가, DOM animation과 완료 신호 발생은 제품 UI가 소유한다.
 */
import type { ChromeLocation, ChromeTabId } from "../../chrome/index.js";
import type { FileExplorerLocation, FileExplorerTabId } from "../../folders/index.js";
import type { ContentResourceRef, FolderResourceRef } from "../../resources/index.js";
import {
  type OperationExecutionContext,
  type OperationHandle,
  OperationTargetQueue,
  TransitionRegistry,
  type TransitionResult,
} from "../../runtime/index.js";
import type { WindowApplicationId, WindowPoint, WindowSize, WindowState } from "../model/index.js";
import type { WindowSessionId } from "../windowSessionId/index.js";
import { WindowStore, type WindowStoreCommandContext } from "../windowStore/index.js";
import type {
  WindowStoreCommittedResult,
  WindowStoreResult,
} from "../windowStore/operationResult/index.js";

/** Window Foundation에서 실행할 수 있는 serializable 사용자 Action이다. */
export type WindowAction =
  /** 지정 위치로 새 File Explorer Session을 만든다. */
  | Readonly<{ type: "create-file-explorer-window"; location: FileExplorerLocation }>
  /** 지정 Chrome 위치 또는 새 탭으로 새 Chrome Session을 만든다. */
  | Readonly<{ type: "create-chrome-window"; location?: ChromeLocation }>
  /** 같은 Folder를 표시하는 Explorer를 활성화하거나 새 Session을 만든다. */
  | Readonly<{ type: "open-folder"; folder: FolderResourceRef }>
  /** 현재 Chrome target에 Content를 열거나 새 Session을 만든다. */
  | Readonly<{ type: "open-content"; content: ContentResourceRef }>
  /** Content를 항상 새 Chrome Session에서 연다. */
  | Readonly<{ type: "open-content-in-new-window"; content: ContentResourceRef }>
  /** mobile에서 고정 application 하나를 실행하거나 활성 상태를 유지한다. */
  | Readonly<{ type: "launch-mobile-application"; applicationId: WindowApplicationId }>
  /** 기존 Session을 활성화하고 최소화 상태라면 복원한다. */
  | Readonly<{ type: "activate"; sessionId: WindowSessionId }>
  /** desktop Session을 최소화한다. */
  | Readonly<{ type: "minimize"; sessionId: WindowSessionId }>
  /** Session과 그 탭 전체를 닫는다. */
  | Readonly<{ type: "close"; sessionId: WindowSessionId }>
  /** desktop Session의 최대화와 normalBounds 복원을 전환한다. */
  | Readonly<{ type: "toggle-maximize"; sessionId: WindowSessionId }>
  /** desktop Session을 숫자 좌표로 이동한다. */
  | Readonly<{ type: "move"; sessionId: WindowSessionId; point: WindowPoint }>
  /** desktop Session을 숫자 크기로 조정한다. */
  | Readonly<{ type: "resize"; sessionId: WindowSessionId; size: WindowSize }>
  /** File Explorer Session에 새 탭을 추가한다. */
  | Readonly<{ type: "add-file-explorer-tab"; sessionId: WindowSessionId }>
  /** Chrome Session에 새 탭을 추가한다. */
  | Readonly<{ type: "add-chrome-tab"; sessionId: WindowSessionId }>
  /** File Explorer Session의 탭을 활성화한다. */
  | Readonly<{
      type: "activate-file-explorer-tab";
      sessionId: WindowSessionId;
      tabId: FileExplorerTabId;
    }>
  /** Chrome Session의 탭을 활성화한다. */
  | Readonly<{ type: "activate-chrome-tab"; sessionId: WindowSessionId; tabId: ChromeTabId }>
  /** File Explorer 탭을 닫고 마지막 탭이면 Session도 닫는다. */
  | Readonly<{
      type: "close-file-explorer-tab";
      sessionId: WindowSessionId;
      tabId: FileExplorerTabId;
    }>
  /** Chrome 탭을 닫고 마지막 탭이면 Session도 닫는다. */
  | Readonly<{ type: "close-chrome-tab"; sessionId: WindowSessionId; tabId: ChromeTabId }>
  /** File Explorer 탭을 새 Folder 위치로 이동한다. */
  | Readonly<{
      type: "navigate-file-explorer";
      sessionId: WindowSessionId;
      tabId: FileExplorerTabId;
      location: FileExplorerLocation;
    }>
  /** Chrome 탭을 새 위치로 이동한다. */
  | Readonly<{
      type: "navigate-chrome";
      sessionId: WindowSessionId;
      tabId: ChromeTabId;
      location: ChromeLocation;
    }>
  /** File Explorer 탭 history에서 뒤로 이동한다. */
  | Readonly<{
      type: "go-back-file-explorer";
      sessionId: WindowSessionId;
      tabId: FileExplorerTabId;
    }>
  /** File Explorer 탭 history에서 앞으로 이동한다. */
  | Readonly<{
      type: "go-forward-file-explorer";
      sessionId: WindowSessionId;
      tabId: FileExplorerTabId;
    }>
  /** Chrome 탭 history에서 뒤로 이동한다. */
  | Readonly<{ type: "go-back-chrome"; sessionId: WindowSessionId; tabId: ChromeTabId }>
  /** Chrome 탭 history에서 앞으로 이동한다. */
  | Readonly<{ type: "go-forward-chrome"; sessionId: WindowSessionId; tabId: ChromeTabId }>
  /** File Explorer 탭의 숫자 scrollTop을 반영한다. */
  | Readonly<{
      type: "set-file-explorer-scroll-top";
      sessionId: WindowSessionId;
      tabId: FileExplorerTabId;
      scrollTop: number;
    }>
  /** Chrome 탭의 숫자 scrollTop을 반영한다. */
  | Readonly<{
      type: "set-chrome-scroll-top";
      sessionId: WindowSessionId;
      tabId: ChromeTabId;
      scrollTop: number;
    }>
  /** Chrome 탭의 현재 위치를 새 history entry 없이 새로 고친다. */
  | Readonly<{ type: "refresh-chrome"; sessionId: WindowSessionId; tabId: ChromeTabId }>;

/** Window semantic commit, no-op과 거절을 구분하는 Handle 결과다. */
export type WindowCommittedResult =
  /** Store가 새 snapshot을 반영하고 명령별 change를 확정했다. */
  | Readonly<{ status: "committed"; result: WindowStoreCommittedResult }>
  /** 현재 상태가 이미 요청을 만족해 상태를 바꾸지 않았다. */
  | Readonly<{ status: "no-op"; result: WindowStoreResult }>
  /** 입력이나 현재 Session·tab 전제가 맞지 않아 상태를 바꾸지 않았다. */
  | Readonly<{ status: "rejected"; result: WindowStoreResult }>;

/** Window Operation이 소유한 transition 또는 전환 없음 결과다. */
export type WindowPresentedResult =
  /** 이 Action에는 제품 UI transition이 필요하지 않았다. */
  | Readonly<{ status: "not-required" }>
  /** 제품 UI가 완료·중단·실패로 종료한 transition 결과다. */
  | TransitionResult;

/** semantic 처리와 transition 정리가 모두 끝난 Window 결과다. */
export type WindowSettledResult = Readonly<{
  status: "settled";
  storeResult: WindowStoreResult;
  presentation: WindowPresentedResult;
}>;

/** Window Action의 세 완료 시점을 노출하는 Operation Handle이다. */
export type WindowOperationHandle = OperationHandle<
  WindowCommittedResult,
  WindowPresentedResult,
  WindowSettledResult
>;

/** Window Operation이 사용하는 기존 WindowStore public surface다. */
export type WindowOperationStore = Pick<
  typeof WindowStore,
  | "getSnapshot"
  | "createFileExplorerWindow"
  | "createChromeWindow"
  | "openFolder"
  | "openContent"
  | "openContentInNewWindow"
  | "launchMobileApplication"
  | "activate"
  | "minimize"
  | "close"
  | "toggleMaximize"
  | "move"
  | "resize"
  | "addFileExplorerTab"
  | "addChromeTab"
  | "activateFileExplorerTab"
  | "activateChromeTab"
  | "closeFileExplorerTab"
  | "closeChromeTab"
  | "navigateFileExplorer"
  | "navigateChrome"
  | "goBackFileExplorer"
  | "goForwardFileExplorer"
  | "goBackChrome"
  | "goForwardChrome"
  | "setFileExplorerScrollTop"
  | "setChromeScrollTop"
  | "refreshChrome"
>;

/** Window Operation의 Store, Session queue와 transition registry dependency다. */
export type WindowOperationsOptions = Readonly<{
  store?: WindowOperationStore;
  queue?: OperationTargetQueue<WindowSessionId>;
  transitions?: TransitionRegistry;
}>;

/** commit이 없었던 WindowStore 결과를 no-op 또는 거절로 분류한다. */
const unchangedResult = (result: WindowStoreResult): WindowCommittedResult =>
  result.ok
    ? Object.freeze({ status: "no-op", result })
    : Object.freeze({ status: "rejected", result });

/** 현재 snapshot에서 Action이 명시한 Session을 찾는다. */
const findSession = (snapshot: WindowState, sessionId: WindowSessionId) =>
  snapshot.sessions.find(({ id }) => id === sessionId);

/** 요청 시점에 기존 Session이 분명한 open Action의 queue target을 찾는다. */
const resolveExistingTarget = (
  snapshot: WindowState,
  action: WindowAction,
): WindowSessionId | null => {
  if ("sessionId" in action) return action.sessionId;
  if (action.type === "launch-mobile-application") return snapshot.sessions[0]?.id ?? null;
  if (action.type === "open-folder") {
    for (let index = snapshot.stackingOrder.length - 1; index >= 0; index -= 1) {
      const session = findSession(snapshot, snapshot.stackingOrder[index]);
      if (session?.kind !== "file-explorer") continue;
      const tab = session.tabs.find(({ id }) => id === session.activeTabId);
      if (tab?.navigation.current.location?.id === action.folder.id) return session.id;
    }
  }
  if (action.type === "open-content" && snapshot.mode === "desktop") {
    const active = snapshot.sessions.find(({ id }) => id === snapshot.activeSessionId);
    if (active?.kind === "chrome") return active.id;
    for (let index = snapshot.stackingOrder.length - 1; index >= 0; index -= 1) {
      const session = findSession(snapshot, snapshot.stackingOrder[index]);
      if (session?.kind === "chrome") return session.id;
    }
  }
  if (action.type === "open-content" && snapshot.sessions[0]?.kind === "chrome") {
    return snapshot.sessions[0].id;
  }
  return null;
};

/** commit 전에 끝나야 하는 Window exit/minimize transition phase를 계산한다. */
const beforeCommitPhase = (snapshot: WindowState, action: WindowAction): string | null => {
  if (!("sessionId" in action)) return null;
  const session = findSession(snapshot, action.sessionId);
  if (session === undefined) return null;
  if (action.type === "minimize") {
    return snapshot.mode === "desktop" && !session.frame.minimized ? "window-minimize" : null;
  }
  if (action.type === "close") return "window-exit";
  if (
    (action.type === "close-file-explorer-tab" || action.type === "close-chrome-tab") &&
    session.tabs.length === 1 &&
    session.tabs.some(({ id }) => id === action.tabId)
  ) {
    return "window-exit";
  }
  return null;
};

/** commit 뒤 UI가 표현해야 하는 enter·restore·maximize transition phase를 계산한다. */
const afterCommitPhase = (
  before: WindowState,
  result: WindowStoreCommittedResult,
): string | null => {
  switch (result.change.kind) {
    case "window-created":
    case "mobile-application-launched":
      return "window-enter";
    case "window-activated":
      return result.change.sessionId !== undefined &&
        findSession(before, result.change.sessionId)?.frame.minimized === true
        ? "window-restore"
        : null;
    case "window-maximized":
      return "window-maximize";
    case "window-restored":
      return "window-restore-normal-bounds";
    default:
      return null;
  }
};

/** Window Action을 Session별로 순차 실행하고 다른 Session은 독립적으로 진행시킨다. */
export class WindowOperations {
  readonly #store: WindowOperationStore;
  readonly #queue: OperationTargetQueue<WindowSessionId>;
  readonly #transitions: TransitionRegistry;

  /** dependency를 보관하며 생략된 값에는 정적 Store와 독립 runtime 요소를 사용한다. */
  constructor(options: WindowOperationsOptions = {}) {
    this.#store = options.store ?? WindowStore;
    this.#queue = options.queue ?? new OperationTargetQueue();
    this.#transitions = options.transitions ?? new TransitionRegistry();
  }

  /** Action을 기존 또는 생성 예정 Session queue에 예약하고 즉시 Handle을 반환한다. */
  execute(action: WindowAction): WindowOperationHandle {
    const target = resolveExistingTarget(this.#store.getSnapshot(), action);
    const executor = (
      context: OperationExecutionContext<
        WindowSessionId,
        WindowCommittedResult,
        WindowPresentedResult
      >,
    ) => this.#run(action, context);
    return target === null ? this.#queue.reserve(executor) : this.#queue.enqueue(target, executor);
  }

  /** Action discriminant를 해당 WindowStore 명령에 일대일로 연결한다. */
  #executeStore(
    action: WindowAction,
    context: WindowStoreCommandContext,
  ): Promise<WindowStoreResult> {
    switch (action.type) {
      case "create-file-explorer-window":
        return this.#store.createFileExplorerWindow(action.location, context);
      case "create-chrome-window":
        return this.#store.createChromeWindow(action.location, context);
      case "open-folder":
        return this.#store.openFolder(action.folder, context);
      case "open-content":
        return this.#store.openContent(action.content, context);
      case "open-content-in-new-window":
        return this.#store.openContentInNewWindow(action.content, context);
      case "launch-mobile-application":
        return this.#store.launchMobileApplication(action.applicationId, context);
      case "activate":
        return this.#store.activate(action.sessionId, context);
      case "minimize":
        return this.#store.minimize(action.sessionId, context);
      case "close":
        return this.#store.close(action.sessionId, context);
      case "toggle-maximize":
        return this.#store.toggleMaximize(action.sessionId, context);
      case "move":
        return this.#store.move(action.sessionId, action.point, context);
      case "resize":
        return this.#store.resize(action.sessionId, action.size, context);
      case "add-file-explorer-tab":
        return this.#store.addFileExplorerTab(action.sessionId, context);
      case "add-chrome-tab":
        return this.#store.addChromeTab(action.sessionId, context);
      case "activate-file-explorer-tab":
        return this.#store.activateFileExplorerTab(action.sessionId, action.tabId, context);
      case "activate-chrome-tab":
        return this.#store.activateChromeTab(action.sessionId, action.tabId, context);
      case "close-file-explorer-tab":
        return this.#store.closeFileExplorerTab(action.sessionId, action.tabId, context);
      case "close-chrome-tab":
        return this.#store.closeChromeTab(action.sessionId, action.tabId, context);
      case "navigate-file-explorer":
        return this.#store.navigateFileExplorer(
          action.sessionId,
          action.tabId,
          action.location,
          context,
        );
      case "navigate-chrome":
        return this.#store.navigateChrome(action.sessionId, action.tabId, action.location, context);
      case "go-back-file-explorer":
        return this.#store.goBackFileExplorer(action.sessionId, action.tabId, context);
      case "go-forward-file-explorer":
        return this.#store.goForwardFileExplorer(action.sessionId, action.tabId, context);
      case "go-back-chrome":
        return this.#store.goBackChrome(action.sessionId, action.tabId, context);
      case "go-forward-chrome":
        return this.#store.goForwardChrome(action.sessionId, action.tabId, context);
      case "set-file-explorer-scroll-top":
        return this.#store.setFileExplorerScrollTop(
          action.sessionId,
          action.tabId,
          action.scrollTop,
          context,
        );
      case "set-chrome-scroll-top":
        return this.#store.setChromeScrollTop(
          action.sessionId,
          action.tabId,
          action.scrollTop,
          context,
        );
      case "refresh-chrome":
        return this.#store.refreshChrome(action.sessionId, action.tabId, context);
    }
  }

  /** 한 Window Action의 before/after commit transition과 Store 결과를 순서대로 완료한다. */
  async #run(
    action: WindowAction,
    context: OperationExecutionContext<
      WindowSessionId,
      WindowCommittedResult,
      WindowPresentedResult
    >,
  ): Promise<WindowSettledResult> {
    const before = this.#store.getSnapshot();
    const beforePhase = beforeCommitPhase(before, action);
    let presentation: WindowPresentedResult | null = null;
    if (beforePhase !== null) {
      presentation = await this.#transitions.waitFor(context.operationId, beforePhase);
      context.completePresented(presentation);
    }

    let committed = false;
    let attached = true;
    const transition = { after: null as Promise<TransitionResult> | null };
    const storeResult = await this.#executeStore(action, {
      onCommit: (result) => {
        committed = true;
        if (result.change.sessionId !== undefined)
          attached = context.attachTarget(result.change.sessionId);
        const phase = afterCommitPhase(before, result);
        if (phase !== null)
          transition.after = this.#transitions.waitFor(context.operationId, phase);
        context.completeCommitted(Object.freeze({ status: "committed", result }));
      },
    });

    if (!committed) context.completeCommitted(unchangedResult(storeResult));
    if (!attached)
      throw new Error("생성된 WindowSession queue를 현재 Operation에 연결할 수 없습니다");
    if (presentation === null) {
      presentation =
        transition.after === null
          ? Object.freeze({ status: "not-required" } as const)
          : await transition.after;
      context.completePresented(presentation);
    }
    return Object.freeze({ status: "settled", storeResult, presentation });
  }
}
