/**
 * @file Taskbar primary panel intent를 semantic state와 UI transition 완료 순서에 연결한다.
 *
 * DOM, focus, portal과 animation 실행은 제품 Component가 소유하고 이 Operation은 panel 상호 배제,
 * close 완료 뒤 query 초기화, switch 순서와 오래된 Resource 결과 무효화만 조율한다.
 */
import {
  type OperationExecutionContext,
  type OperationHandle,
  OperationTargetQueue,
  TransitionRegistry,
  type TransitionResult,
} from "../../../runtime/index.js";
import type { PrimaryPanelChange, PrimaryPanelCommandResult } from "../commands/index.js";
import type { PrimaryPanelId, PrimaryPanelSnapshot } from "../model/index.js";
import { selectPrimaryPanelTriggerIntent } from "../selectors/index.js";
import { createPrimaryPanelState, type PrimaryPanelState } from "../state/index.js";

/** panel transition Operation이 UI에 요청하는 enter phase다. */
export const PRIMARY_PANEL_ENTER_PHASE = "primary-panel-enter";
/** panel transition Operation이 UI에 요청하는 exit phase다. */
export const PRIMARY_PANEL_EXIT_PHASE = "primary-panel-exit";

const PRIMARY_PANEL_TRANSITION_TARGET = "primary-panel-transition" as const;

type PrimaryPanelOperationTarget =
  typeof PRIMARY_PANEL_TRANSITION_TARGET | `primary-panel-query:${PrimaryPanelId}`;

/** UI가 판정한 실제 dismiss 원인이다. portal 내부 이동은 UI에서 이 Action으로 만들지 않는다. */
export type PrimaryPanelDismissReason = "escape" | "outside-interaction" | "focus-loss";

/** Resource open 연결에서 사용하는 caller 발급 식별자다. */
export type PrimaryPanelResourceOpenRequestId = string;

/** primary panel 제품 경계가 실행할 수 있는 serializable Action이다. */
export type PrimaryPanelAction =
  /** Start toggle과 Search 유지 정책을 현재 상태에서 다시 계산한다. */
  | Readonly<{ type: "trigger"; panel: PrimaryPanelId }>
  /** UI가 실제 외부 이탈 또는 Escape를 판정한 active panel을 닫는다. */
  | Readonly<{ type: "dismiss"; panel: PrimaryPanelId; reason: PrimaryPanelDismissReason }>
  /** controlled query를 trim 없이 갱신한다. */
  | Readonly<{ type: "update-query"; panel: PrimaryPanelId; query: string }>
  /** mobile 진입 시 현재 panel을 닫고 대기 중 desktop open을 무효화한다. */
  | Readonly<{ type: "dismiss-for-mobile" }>
  /** 실제 Resource open 직전 요청 panel과 현재 activation을 request ID에 연결한다. */
  | Readonly<{
      type: "track-resource-open";
      /** 생략은 기존 Search caller 호환이며 새 panel 연결은 identity를 명시한다. */
      panel?: PrimaryPanelId;
      requestId: PrimaryPanelResourceOpenRequestId;
    }>
  /** Resource open 결과를 전달하고 추적한 현재 panel activation의 성공일 때만 닫는다. */
  | Readonly<{
      type: "settle-resource-open";
      requestId: PrimaryPanelResourceOpenRequestId;
      outcome: "succeeded" | "failed";
    }>;

/** panel Action의 semantic 적용 또는 명시적 보존 결과다. */
export type PrimaryPanelCommittedResult =
  | Readonly<{
      status: "committed";
      action: PrimaryPanelAction;
      snapshot: PrimaryPanelSnapshot;
      changes: readonly PrimaryPanelChange[];
    }>
  | Readonly<{
      status: "tracked";
      action: Extract<PrimaryPanelAction, { type: "track-resource-open" }>;
      snapshot: PrimaryPanelSnapshot;
    }>
  | Readonly<{
      status: "no-op";
      action: PrimaryPanelAction;
      snapshot: PrimaryPanelSnapshot;
      reason:
        | "already-closed"
        | "search-maintained"
        | "unchanged-query"
        | "resource-open-failed"
        | "stale-resource-open";
    }>
  | Readonly<{
      status: "rejected";
      action: PrimaryPanelAction;
      snapshot: PrimaryPanelSnapshot;
      reason:
        | "desktop-unavailable"
        | "duplicate-request"
        | "panel-not-active"
        | "search-not-active"
        | "stale-desktop-request";
    }>;

/** 현재 Operation이 소유한 panel 표현 완료 결과다. */
export type PrimaryPanelPresentedResult =
  | Readonly<{ status: "not-required" }>
  | TransitionResult
  | Readonly<{ status: "sequence-completed"; results: readonly TransitionResult[] }>;

/** semantic 처리와 panel 표현 정리가 모두 끝난 결과다. */
export type PrimaryPanelSettledResult = Readonly<{
  status: "settled";
  result: PrimaryPanelCommittedResult;
  presentation: PrimaryPanelPresentedResult;
}>;

/** PrimaryPanel Action의 완료 시점별 Promise를 제공하는 Handle이다. */
export type PrimaryPanelOperationHandle = OperationHandle<
  PrimaryPanelCommittedResult,
  PrimaryPanelPresentedResult,
  PrimaryPanelSettledResult
>;

/** 실행 시점의 responsive mode를 읽는 DOM-free port다. */
export type PrimaryPanelModeReader = Readonly<{
  getMode(): "desktop" | "mobile" | "not-ready";
}>;

/** PrimaryPanel Operation dependency를 교체하는 생성 옵션이다. */
export type PrimaryPanelOperationsOptions = Readonly<{
  state?: PrimaryPanelState;
  modeReader: PrimaryPanelModeReader;
  queue?: OperationTargetQueue<PrimaryPanelOperationTarget>;
  transitions?: TransitionRegistry;
  /**
   * exit 완료와 query 초기화 직후 해당 panel의 인접 transient를 정리한다.
   */
  onCloseComplete?: (panel: PrimaryPanelId) => void;
}>;

type TrackedResourceOpenRequest = Readonly<{
  panel: PrimaryPanelId;
  activationRevision: number;
}>;

type ExecutionContext = OperationExecutionContext<
  PrimaryPanelOperationTarget,
  PrimaryPanelCommittedResult,
  PrimaryPanelPresentedResult
>;

/** changed command의 공개 change만 누적한다. */
const appendChange = (changes: PrimaryPanelChange[], result: PrimaryPanelCommandResult): void => {
  if (result.status === "changed") changes.push(result.change);
};

/** transition 결과 수에 맞는 immutable presentation을 만든다. */
const presentationOf = (results: readonly TransitionResult[]): PrimaryPanelPresentedResult => {
  if (results.length === 0) return Object.freeze({ status: "not-required" });
  if (results.length === 1) return results[0];
  return Object.freeze({ status: "sequence-completed", results: Object.freeze([...results]) });
};

/** committed 결과의 배열과 객체를 immutable하게 고정한다. */
const committedResult = (
  action: PrimaryPanelAction,
  snapshot: PrimaryPanelSnapshot,
  changes: readonly PrimaryPanelChange[],
): PrimaryPanelCommittedResult =>
  Object.freeze({
    status: "committed",
    action,
    snapshot,
    changes: Object.freeze([...changes]),
  });

/** panel transition queue와 query 입력 queue를 분리해 제품 순서와 입력 반응성을 함께 보존한다. */
export class PrimaryPanelOperations {
  readonly #state: PrimaryPanelState;
  readonly #modeReader: PrimaryPanelModeReader;
  readonly #queue: OperationTargetQueue<PrimaryPanelOperationTarget>;
  readonly #transitions: TransitionRegistry;
  readonly #onCloseComplete: ((panel: PrimaryPanelId) => void) | undefined;
  readonly #resourceRequests = new Map<
    PrimaryPanelResourceOpenRequestId,
    TrackedResourceOpenRequest
  >();
  #activationRevision = 0;
  #mobileRevision = 0;

  /** in-memory state, responsive reader와 공용 transition registry를 보관한다. */
  constructor(options: PrimaryPanelOperationsOptions) {
    this.#state = options.state ?? createPrimaryPanelState();
    this.#modeReader = options.modeReader;
    this.#queue = options.queue ?? new OperationTargetQueue();
    this.#transitions = options.transitions ?? new TransitionRegistry();
    this.#onCloseComplete = options.onCloseComplete;
  }

  /** Action을 목적에 맞는 queue에 넣고 완료 시점별 Handle을 즉시 반환한다. */
  execute(action: PrimaryPanelAction): PrimaryPanelOperationHandle {
    const mobileRevision = this.#mobileRevision;
    const requestedActivationRevision = this.#activationRevision;
    if (action.type === "dismiss-for-mobile") {
      this.#invalidateActivation();
      this.#mobileRevision += 1;
    }
    if (action.type === "update-query") {
      return this.#queue.enqueue(`primary-panel-query:${action.panel}`, (context) =>
        this.#run(action, context, mobileRevision),
      );
    }
    return this.#queue.enqueue(PRIMARY_PANEL_TRANSITION_TARGET, (context) =>
      this.#run(action, context, mobileRevision, requestedActivationRevision),
    );
  }

  /** 한 Action의 phase를 반드시 완료하고 cleanup에서 남은 transition 대기를 중단한다. */
  async #run(
    action: PrimaryPanelAction,
    context: ExecutionContext,
    mobileRevision: number,
    requestedActivationRevision = this.#activationRevision,
  ): Promise<PrimaryPanelSettledResult> {
    context.onCleanup(() => {
      this.#transitions.abortOperation(context.operationId, "primary-panel-operation-settled");
    });

    if (action.type === "update-query") return this.#runQuery(action, context);
    if (action.type === "track-resource-open")
      return this.#trackResourceOpen(action, context, requestedActivationRevision);
    if (action.type === "settle-resource-open") {
      return this.#settleResourceOpen(action, context);
    }
    if (action.type === "dismiss-for-mobile") return this.#dismissForMobile(action, context);
    if (action.type === "dismiss") return this.#dismiss(action, context);
    return this.#trigger(action, context, mobileRevision);
  }

  /** 결과와 표현 없음으로 Handle 세 phase를 즉시 끝낸다. */
  #finishWithoutPresentation(
    result: PrimaryPanelCommittedResult,
    context: ExecutionContext,
  ): PrimaryPanelSettledResult {
    const presentation = Object.freeze({ status: "not-required" } as const);
    context.completeCommitted(result);
    context.completePresented(presentation);
    return Object.freeze({ status: "settled", result, presentation });
  }

  /** 현재 mode에서 desktop panel을 열 수 있는지 실행 시점마다 다시 확인한다. */
  #canOpenDesktopPanel(): boolean {
    return this.#modeReader.getMode() === "desktop";
  }

  /** query 변경은 panel enter/exit queue를 기다리지 않고 독립적으로 commit한다. */
  #runQuery(
    action: Extract<PrimaryPanelAction, { type: "update-query" }>,
    context: ExecutionContext,
  ): PrimaryPanelSettledResult {
    const command = this.#state.updateQuery(action.panel, action.query);
    const result =
      command.status === "changed"
        ? committedResult(action, command.snapshot, [command.change])
        : Object.freeze({
            status: "no-op",
            action,
            snapshot: command.snapshot,
            reason: "unchanged-query",
          } as const);
    return this.#finishWithoutPresentation(result, context);
  }

  /**
   * 요청 당시와 실행 시 activation이 같을 때만 panel identity를 request ID에 연결한다.
   */
  #trackResourceOpen(
    action: Extract<PrimaryPanelAction, { type: "track-resource-open" }>,
    context: ExecutionContext,
    requestedActivationRevision: number,
  ): PrimaryPanelSettledResult {
    const snapshot = this.#state.getSnapshot();
    const panel = action.panel ?? "search";
    let result: PrimaryPanelCommittedResult;
    if (this.#resourceRequests.has(action.requestId)) {
      result = Object.freeze({ status: "rejected", action, snapshot, reason: "duplicate-request" });
    } else if (
      snapshot.activePanel !== panel ||
      requestedActivationRevision !== this.#activationRevision ||
      !this.#canOpenDesktopPanel()
    ) {
      result = Object.freeze({
        status: "rejected",
        action,
        snapshot,
        reason: action.panel === undefined ? "search-not-active" : "panel-not-active",
      });
    } else {
      this.#resourceRequests.set(
        action.requestId,
        Object.freeze({ panel, activationRevision: this.#activationRevision }),
      );
      result = Object.freeze({ status: "tracked", action, snapshot });
    }
    return this.#finishWithoutPresentation(result, context);
  }

  /** Resource 실패는 상태를 보존하고 현재 activation의 성공만 close 순서로 보낸다. */
  async #settleResourceOpen(
    action: Extract<PrimaryPanelAction, { type: "settle-resource-open" }>,
    context: ExecutionContext,
  ): Promise<PrimaryPanelSettledResult> {
    const trackedRequest = this.#resourceRequests.get(action.requestId);
    this.#resourceRequests.delete(action.requestId);
    const snapshot = this.#state.getSnapshot();
    if (
      trackedRequest === undefined ||
      trackedRequest.activationRevision !== this.#activationRevision ||
      snapshot.activePanel !== trackedRequest.panel ||
      !this.#canOpenDesktopPanel()
    ) {
      return this.#finishWithoutPresentation(
        Object.freeze({ status: "no-op", action, snapshot, reason: "stale-resource-open" }),
        context,
      );
    }
    if (action.outcome === "failed") {
      return this.#finishWithoutPresentation(
        Object.freeze({ status: "no-op", action, snapshot, reason: "resource-open-failed" }),
        context,
      );
    }
    return this.#close(trackedRequest.panel, action, context);
  }

  /**
   * mobile signal에서 대기 open을 무효화한 뒤 양쪽 입력과 인접 transient를 정리한다.
   */
  async #dismissForMobile(
    action: Extract<PrimaryPanelAction, { type: "dismiss-for-mobile" }>,
    context: ExecutionContext,
  ): Promise<PrimaryPanelSettledResult> {
    const panel = this.#state.getSnapshot().activePanel;
    const changes: PrimaryPanelChange[] = [];
    const transitions: TransitionResult[] = [];
    if (panel === null) {
      appendChange(changes, this.#state.completeClose("start"));
      appendChange(changes, this.#state.completeClose("search"));
      this.#onCloseComplete?.("start");
      this.#onCloseComplete?.("search");
      return this.#finishWithoutPresentation(
        changes.length > 0
          ? committedResult(action, this.#state.getSnapshot(), changes)
          : Object.freeze({
              status: "no-op",
              action,
              snapshot: this.#state.getSnapshot(),
              reason: "already-closed",
            }),
        context,
      );
    }
    await this.#deactivateAndWait(panel, context, changes, transitions);
    const other = panel === "start" ? "search" : "start";
    appendChange(changes, this.#state.completeClose(other));
    this.#onCloseComplete?.(other);
    const result = committedResult(action, this.#state.getSnapshot(), changes);
    context.completeCommitted(result);
    return this.#finishPresented(result, transitions, context);
  }

  /** UI가 판정한 dismiss가 아직 같은 active panel을 가리킬 때만 닫는다. */
  #dismiss(
    action: Extract<PrimaryPanelAction, { type: "dismiss" }>,
    context: ExecutionContext,
  ): Promise<PrimaryPanelSettledResult> | PrimaryPanelSettledResult {
    if (this.#state.getSnapshot().activePanel !== action.panel) {
      return this.#finishWithoutPresentation(
        Object.freeze({
          status: "no-op",
          action,
          snapshot: this.#state.getSnapshot(),
          reason: "already-closed",
        }),
        context,
      );
    }
    return this.#close(action.panel, action, context);
  }

  /** Start toggle, Search 유지, 새 open과 switch를 최신 snapshot에서 판정한다. */
  async #trigger(
    action: Extract<PrimaryPanelAction, { type: "trigger" }>,
    context: ExecutionContext,
    requestedMobileRevision: number,
  ): Promise<PrimaryPanelSettledResult> {
    if (requestedMobileRevision !== this.#mobileRevision) {
      return this.#finishWithoutPresentation(
        Object.freeze({
          status: "rejected",
          action,
          snapshot: this.#state.getSnapshot(),
          reason: "stale-desktop-request",
        }),
        context,
      );
    }
    if (!this.#canOpenDesktopPanel()) {
      return this.#finishWithoutPresentation(
        Object.freeze({
          status: "rejected",
          action,
          snapshot: this.#state.getSnapshot(),
          reason: "desktop-unavailable",
        }),
        context,
      );
    }
    const intent = selectPrimaryPanelTriggerIntent(this.#state.getSnapshot(), action.panel);
    if (intent.kind === "maintain") {
      return this.#finishWithoutPresentation(
        Object.freeze({
          status: "no-op",
          action,
          snapshot: this.#state.getSnapshot(),
          reason: "search-maintained",
        }),
        context,
      );
    }
    if (intent.kind === "close") return this.#close(intent.panel, action, context);
    if (intent.kind === "open") return this.#open(intent.panel, action, context);

    const changes: PrimaryPanelChange[] = [];
    const presentation: TransitionResult[] = [];
    await this.#deactivateAndWait(intent.from, context, changes, presentation);
    if (requestedMobileRevision === this.#mobileRevision && this.#canOpenDesktopPanel()) {
      this.#activate(intent.to, changes);
      const result = committedResult(action, this.#state.getSnapshot(), changes);
      context.completeCommitted(result);
      presentation.push(
        await this.#transitions.waitFor(context.operationId, PRIMARY_PANEL_ENTER_PHASE),
      );
      return this.#finishPresented(result, presentation, context);
    }
    const result = committedResult(action, this.#state.getSnapshot(), changes);
    context.completeCommitted(result);
    return this.#finishPresented(result, presentation, context);
  }

  /** 닫힌 상태에서 active identity를 commit한 뒤 enter 완료를 기다린다. */
  async #open(
    panel: PrimaryPanelId,
    action: PrimaryPanelAction,
    context: ExecutionContext,
  ): Promise<PrimaryPanelSettledResult> {
    const changes: PrimaryPanelChange[] = [];
    this.#activate(panel, changes);
    const result = committedResult(action, this.#state.getSnapshot(), changes);
    context.completeCommitted(result);
    const transition = await this.#transitions.waitFor(
      context.operationId,
      PRIMARY_PANEL_ENTER_PHASE,
    );
    return this.#finishPresented(result, [transition], context);
  }

  /** active identity를 제거하고 exit 완료 뒤 query를 초기화한다. */
  async #close(
    panel: PrimaryPanelId,
    action: PrimaryPanelAction,
    context: ExecutionContext,
  ): Promise<PrimaryPanelSettledResult> {
    const changes: PrimaryPanelChange[] = [];
    const transitions: TransitionResult[] = [];
    await this.#deactivateAndWait(panel, context, changes, transitions);
    const result = committedResult(action, this.#state.getSnapshot(), changes);
    context.completeCommitted(result);
    return this.#finishPresented(result, transitions, context);
  }

  /** active panel을 끄고 UI exit가 끝난 뒤 close-complete command를 적용한다. */
  async #deactivateAndWait(
    panel: PrimaryPanelId,
    context: ExecutionContext,
    changes: PrimaryPanelChange[],
    transitions: TransitionResult[],
  ): Promise<void> {
    const deactivated = this.#state.deactivate(panel);
    appendChange(changes, deactivated);
    if (deactivated.status !== "changed") return;
    this.#invalidateActivation();
    transitions.push(
      await this.#transitions.waitFor(context.operationId, PRIMARY_PANEL_EXIT_PHASE),
    );
    appendChange(changes, this.#state.completeClose(panel));
    this.#onCloseComplete?.(panel);
  }

  /** 새 active identity를 만들고 Resource 결과를 구분할 activation revision을 발급한다. */
  #activate(panel: PrimaryPanelId, changes: PrimaryPanelChange[]): void {
    const activated = this.#state.activate(panel);
    appendChange(changes, activated);
    if (activated.status === "changed") this.#activationRevision += 1;
  }

  /** 현재 activation request를 폐기하고 늦은 결과가 다음 panel에 적용되지 않게 한다. */
  #invalidateActivation(): void {
    const current = this.#activationRevision;
    for (const [requestId, request] of this.#resourceRequests) {
      if (request.activationRevision === current) this.#resourceRequests.delete(requestId);
    }
    this.#activationRevision += 1;
  }

  /** presentation을 완료하고 settled 결과를 만든다. */
  #finishPresented(
    result: PrimaryPanelCommittedResult,
    transitions: readonly TransitionResult[],
    context: ExecutionContext,
  ): PrimaryPanelSettledResult {
    const presentation = presentationOf(transitions);
    context.completePresented(presentation);
    return Object.freeze({ status: "settled", result, presentation });
  }
}
