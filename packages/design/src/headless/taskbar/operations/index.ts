/**
 * @file Taskbar Pin Action을 목록 queue, Store commit·persistence와 항목 transition에 연결한다.
 *
 * visible/persistent 순서 계산은 TaskbarStore가, layout 측정과 animation은 제품 UI가 소유한다.
 */
import type { ResourceRef } from "../../resources/index.js";
import {
  type OperationExecutionContext,
  type OperationHandle,
  OperationTargetQueue,
  TransitionRegistry,
  type TransitionResult,
} from "../../runtime/index.js";
import type { WindowState } from "../../windows/index.js";
import { WindowStore } from "../../windows/index.js";
import type { TaskbarItem, TaskbarReorderIntent, TaskbarSnapshot } from "../model/index.js";
import { TaskbarStore, type TaskbarStoreCommandContext } from "../taskbarStore/index.js";
import type { TaskbarStoreResult } from "../taskbarStore/operationResult/index.js";

/** Taskbar 목록 Operation이 공유하는 queue key다. */
export const TASKBAR_OPERATION_TARGET = "taskbar-pins" as const;

/** Taskbar Pin 사용자 intent의 serializable 표현이다. */
export type TaskbarPinAction =
  /** application 또는 ExternalShortcut을 persistent Pin으로 추가한다. */
  | Readonly<{ type: "pin"; item: TaskbarItem | ResourceRef }>
  /** persistent Pin을 제거하고 running application의 visible 위치는 보존한다. */
  | Readonly<{ type: "unpin"; item: TaskbarItem | ResourceRef }>
  /** visible 항목을 상대 위치 또는 지정 index로 옮긴다. */
  | Readonly<{ type: "reorder"; item: TaskbarItem | ResourceRef; intent: TaskbarReorderIntent }>;

/** Taskbar semantic commit, no-op과 거절을 구분하는 결과다. */
export type TaskbarCommittedResult =
  /** Store가 새 persistent·visible snapshot을 메모리에 반영했다. */
  | Readonly<{ status: "committed"; value: TaskbarSnapshot }>
  /** 현재 상태가 요청을 이미 만족해 commit과 저장을 생략했다. */
  | Readonly<{ status: "no-op"; result: TaskbarStoreResult }>
  /** 입력 또는 현재 목록 전제가 맞지 않아 상태를 바꾸지 않았다. */
  | Readonly<{ status: "rejected"; result: TaskbarStoreResult }>;

/** Taskbar 항목 transition이 없거나 단계별로 끝난 결과다. */
export type TaskbarPresentedResult =
  /** running application처럼 항목 transition이 필요하지 않았다. */
  | Readonly<{ status: "not-required" }>
  /** 단일 항목 enter 또는 exit transition의 종료 결과다. */
  | TransitionResult
  /** reorder 측정과 이동처럼 여러 phase가 순서대로 종료됐다. */
  | Readonly<{ status: "sequence-completed"; results: readonly TransitionResult[] }>;

/** persistence까지 포함한 Taskbar Operation 전체 결과다. */
export type TaskbarSettledResult = Readonly<{
  status: "settled";
  storeResult: TaskbarStoreResult;
  presentation: TaskbarPresentedResult;
}>;

/** Taskbar Action의 완료 시점별 Promise를 제공하는 Handle이다. */
export type TaskbarOperationHandle = OperationHandle<
  TaskbarCommittedResult,
  TaskbarPresentedResult,
  TaskbarSettledResult
>;

/** Taskbar Operation이 사용하는 Store public 명령의 최소 port다. */
export type TaskbarOperationStore = Readonly<{
  getSnapshot(): TaskbarSnapshot;
  isPinned(item: TaskbarItem | ResourceRef): boolean;
  pin(
    item: TaskbarItem | ResourceRef,
    context?: TaskbarStoreCommandContext,
  ): Promise<TaskbarStoreResult>;
  unpin(
    item: TaskbarItem | ResourceRef,
    context?: TaskbarStoreCommandContext,
  ): Promise<TaskbarStoreResult>;
  reorder(
    item: TaskbarItem | ResourceRef,
    intent: TaskbarReorderIntent,
    context?: TaskbarStoreCommandContext,
  ): Promise<TaskbarStoreResult>;
}>;

/** Taskbar Pin Operation에 필요한 현재 Window snapshot reader다. */
export type TaskbarOperationWindowReader = Readonly<{ getSnapshot(): WindowState }>;

/** Taskbar Operation dependency를 선택적으로 교체하는 생성 옵션이다. */
export type TaskbarOperationsOptions = Readonly<{
  store?: TaskbarOperationStore;
  windowReader?: TaskbarOperationWindowReader;
  queue?: OperationTargetQueue<typeof TASKBAR_OPERATION_TARGET>;
  transitions?: TransitionRegistry;
}>;

/** Taskbar item의 application 또는 Resource identity key를 만든다. */
const itemKey = (item: TaskbarItem | ResourceRef): string | null => {
  if (item.kind === "application" && "applicationId" in item)
    return `application:${item.applicationId}`;
  if (item.kind === "external-shortcut") {
    const resource = "resource" in item ? item.resource : item;
    return `external-shortcut:${resource.id}`;
  }
  return null;
};

/** 같은 Taskbar identity인지 비교한다. */
const sameItem = (left: TaskbarItem, right: TaskbarItem | ResourceRef): boolean =>
  itemKey(left) !== null && itemKey(left) === itemKey(right);

/** running application인지 현재 Window snapshot에서 확인한다. */
const isRunning = (item: TaskbarItem | ResourceRef, state: WindowState): boolean =>
  item.kind === "application" &&
  "applicationId" in item &&
  state.sessions.some(({ applicationId }) => applicationId === item.applicationId);

/** reorder가 현재 visible 목록을 실제로 바꾸는지 사전 확인한다. */
const shouldReorder = (
  snapshot: TaskbarSnapshot,
  action: Extract<TaskbarPinAction, { type: "reorder" }>,
) => {
  const index = snapshot.visibleItems.findIndex((item) => sameItem(item, action.item));
  if (index < 0) return false;
  if (typeof action.intent === "object") {
    return (
      Number.isInteger(action.intent.index) &&
      action.intent.index >= 0 &&
      action.intent.index < snapshot.visibleItems.length &&
      action.intent.index !== index
    );
  }
  const target =
    action.intent === "first"
      ? 0
      : action.intent === "left"
        ? Math.max(0, index - 1)
        : action.intent === "right"
          ? Math.min(snapshot.visibleItems.length - 1, index + 1)
          : index;
  return target !== index;
};

/** commit이 없었던 Store 결과를 no-op 또는 거절로 분류한다. */
const unchangedResult = (result: TaskbarStoreResult): TaskbarCommittedResult => {
  if (result.ok) return Object.freeze({ status: "rejected", result });
  return Object.freeze({ status: result.reason === "no-op" ? "no-op" : "rejected", result });
};

/** 여러 transition 결과를 하나의 immutable presented 결과로 묶는다. */
const sequenceResult = (results: readonly TransitionResult[]): TaskbarPresentedResult =>
  results.length === 1
    ? results[0]
    : Object.freeze({ status: "sequence-completed", results: Object.freeze([...results]) });

/** Taskbar Pin Action을 목록 단위로 직렬 실행한다. */
export class TaskbarOperations {
  readonly #store: TaskbarOperationStore;
  readonly #windowReader: TaskbarOperationWindowReader;
  readonly #queue: OperationTargetQueue<typeof TASKBAR_OPERATION_TARGET>;
  readonly #transitions: TransitionRegistry;

  /** Store, Window reader와 runtime 요소를 보관하며 생략하면 기본 singleton을 사용한다. */
  constructor(options: TaskbarOperationsOptions = {}) {
    this.#store = options.store ?? TaskbarStore;
    this.#windowReader = options.windowReader ?? WindowStore;
    this.#queue = options.queue ?? new OperationTargetQueue();
    this.#transitions = options.transitions ?? new TransitionRegistry();
  }

  /** Action을 Taskbar 목록 queue에 넣고 즉시 완료 시점별 Handle을 반환한다. */
  execute(action: TaskbarPinAction): TaskbarOperationHandle {
    return this.#queue.enqueue(TASKBAR_OPERATION_TARGET, (context) => this.#run(action, context));
  }

  /** Action 종류에 맞는 기존 TaskbarStore 명령을 호출한다. */
  #executeStore(
    action: TaskbarPinAction,
    context: TaskbarStoreCommandContext,
  ): Promise<TaskbarStoreResult> {
    switch (action.type) {
      case "pin":
        return this.#store.pin(action.item, context);
      case "unpin":
        return this.#store.unpin(action.item, context);
      case "reorder":
        return this.#store.reorder(action.item, action.intent, context);
    }
  }

  /** 한 Action의 exit/measure, commit, enter/measure/move와 저장 완료를 조율한다. */
  async #run(
    action: TaskbarPinAction,
    context: OperationExecutionContext<
      typeof TASKBAR_OPERATION_TARGET,
      TaskbarCommittedResult,
      TaskbarPresentedResult
    >,
  ): Promise<TaskbarSettledResult> {
    const snapshot = this.#store.getSnapshot();
    const visible = snapshot.visibleItems.some((item) => sameItem(item, action.item));
    const pinned = this.#store.isPinned(action.item);
    const shouldExit =
      action.type === "unpin" &&
      pinned &&
      !isRunning(action.item, this.#windowReader.getSnapshot());
    const reorder = action.type === "reorder" && shouldReorder(snapshot, action);
    const before: TransitionResult[] = [];
    if (shouldExit)
      before.push(await this.#transitions.waitFor(context.operationId, "taskbar-item-exit"));
    else if (reorder)
      before.push(
        await this.#transitions.waitFor(context.operationId, "taskbar-reorder-measure-before"),
      );

    let committed = false;
    const transition = { afterCommit: null as Promise<TransitionResult[]> | null };
    const storeResult = await this.#executeStore(action, {
      onCommit: (value) => {
        committed = true;
        context.completeCommitted(Object.freeze({ status: "committed", value }));
        if (action.type === "pin" && !visible) {
          transition.afterCommit = Promise.all([
            this.#transitions.waitFor(context.operationId, "taskbar-item-enter"),
          ]);
        } else if (reorder) {
          transition.afterCommit = (async () => {
            const measured = await this.#transitions.waitFor(
              context.operationId,
              "taskbar-reorder-measure-after",
            );
            const moved = await this.#transitions.waitFor(
              context.operationId,
              "taskbar-reorder-move",
            );
            return [measured, moved];
          })();
        }
      },
    });
    if (!committed) context.completeCommitted(unchangedResult(storeResult));
    const presentation =
      transition.afterCommit === null
        ? before.length === 0
          ? Object.freeze({ status: "not-required" } as const)
          : sequenceResult(before)
        : sequenceResult([...before, ...(await transition.afterCommit)]);
    context.completePresented(presentation);
    return Object.freeze({ status: "settled", storeResult, presentation });
  }
}
