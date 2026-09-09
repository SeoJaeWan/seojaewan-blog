/**
 * @file Start Pin Action을 목록 단위 queue, Store commit과 UI transition 순서에 연결한다.
 *
 * Pin 계산과 persistence는 StartStore가 소유하며 DOM 측정과 animation 구현은 제품 UI가 소유한다.
 */
import type { ResourceRef } from "../../resources/index.js";
import {
  type OperationExecutionContext,
  type OperationHandle,
  OperationTargetQueue,
  TransitionRegistry,
  type TransitionResult,
} from "../../runtime/index.js";
import type { StartReorderIntent, StartSnapshot } from "../model/index.js";
import { StartStore, type StartStoreCommandContext } from "../startStore/index.js";
import type { StartStoreResult } from "../startStore/operationResult/index.js";

/** Start 목록 Operation이 공유하는 단일 queue key다. */
export const START_OPERATION_TARGET = "start-pins" as const;

/** Start Pin 사용자 intent의 serializable 표현이다. */
export type StartAction =
  /** 존재 Resource를 Start 목록 끝에 추가한다. */
  | Readonly<{ type: "pin"; resource: ResourceRef }>
  /** 기존 Resource Pin을 목록에서 제거한다. */
  | Readonly<{ type: "unpin"; resource: ResourceRef }>
  /** 기존 Resource Pin을 상대 위치 또는 지정 index로 옮긴다. */
  | Readonly<{ type: "reorder"; resource: ResourceRef; intent: StartReorderIntent }>;

/** semantic commit, no-op과 거절을 구분하는 Start Handle 결과다. */
export type StartCommittedResult =
  /** Store가 새 snapshot을 메모리에 반영하고 명령별 commit을 알렸다. */
  | Readonly<{ status: "committed"; value: StartSnapshot }>
  /** 요청이 현재 상태와 같아 commit, transition과 저장을 생략했다. */
  | Readonly<{ status: "no-op"; result: StartStoreResult }>
  /** 입력 또는 현재 Resource 전제가 맞지 않아 상태를 바꾸지 않았다. */
  | Readonly<{ status: "rejected"; result: StartStoreResult }>;

/** Start Operation이 소유한 transition이 없거나 한 단계 이상 끝난 결과다. */
export type StartPresentedResult =
  /** 실제 항목 transition이 필요하지 않았다. */
  | Readonly<{ status: "not-required" }>
  /** 단일 enter 또는 exit transition의 종료 결과다. */
  | TransitionResult
  /** reorder 측정과 이동처럼 여러 phase가 순서대로 종료됐다. */
  | Readonly<{ status: "sequence-completed"; results: readonly TransitionResult[] }>;

/** persistence까지 포함해 Start Operation 전체가 끝난 결과다. */
export type StartSettledResult = Readonly<{
  status: "settled";
  storeResult: StartStoreResult;
  presentation: StartPresentedResult;
}>;

/** Start Action 호출자가 세 완료 시점을 따로 기다리는 Handle이다. */
export type StartOperationHandle = OperationHandle<
  StartCommittedResult,
  StartPresentedResult,
  StartSettledResult
>;

/** Start Operation이 사용하는 기존 Store 명령의 최소 port다. */
export type StartOperationStore = Readonly<{
  getSnapshot(): StartSnapshot;
  isPinned(resource: ResourceRef): boolean;
  pin(resource: ResourceRef, context?: StartStoreCommandContext): Promise<StartStoreResult>;
  unpin(resource: ResourceRef, context?: StartStoreCommandContext): Promise<StartStoreResult>;
  reorder(
    resource: ResourceRef,
    intent: StartReorderIntent,
    context?: StartStoreCommandContext,
  ): Promise<StartStoreResult>;
}>;

/** Start Operation의 Store, queue와 transition registry dependency다. */
export type StartOperationsOptions = Readonly<{
  store?: StartOperationStore;
  queue?: OperationTargetQueue<typeof START_OPERATION_TARGET>;
  transitions?: TransitionRegistry;
}>;

/** 두 ResourceRef의 kind와 ID가 같은지 비교한다. */
const sameResource = (left: ResourceRef, right: ResourceRef): boolean =>
  left.kind === right.kind && left.id === right.id;

/** reorder가 현재 snapshot에서 명백한 no-op 또는 거절인지 판별한다. */
const shouldReorder = (
  snapshot: StartSnapshot,
  action: Extract<StartAction, { type: "reorder" }>,
) => {
  const index = snapshot.pinnedItems.findIndex(({ resource }) =>
    sameResource(resource, action.resource),
  );
  if (index < 0) return false;
  if (typeof action.intent === "object") {
    return (
      Number.isInteger(action.intent.index) &&
      action.intent.index >= 0 &&
      action.intent.index < snapshot.pinnedItems.length &&
      action.intent.index !== index
    );
  }
  const target =
    action.intent === "first"
      ? 0
      : action.intent === "left"
        ? Math.max(0, index - 1)
        : action.intent === "right"
          ? Math.min(snapshot.pinnedItems.length - 1, index + 1)
          : index;
  return target !== index;
};

/** Store의 최종 결과를 no-op 또는 거절 Handle 결과로 바꾼다. */
const unchangedResult = (result: StartStoreResult): StartCommittedResult => {
  if (result.ok) return Object.freeze({ status: "rejected", result });
  return Object.freeze({ status: result.reason === "no-op" ? "no-op" : "rejected", result });
};

/** 여러 transition 결과를 하나의 immutable presented 결과로 묶는다. */
const sequenceResult = (results: readonly TransitionResult[]): StartPresentedResult =>
  results.length === 1
    ? results[0]
    : Object.freeze({ status: "sequence-completed", results: Object.freeze([...results]) });

/** Start Action을 Store commit과 정해진 transition 순서로 실행한다. */
export class StartOperations {
  readonly #store: StartOperationStore;
  readonly #queue: OperationTargetQueue<typeof START_OPERATION_TARGET>;
  readonly #transitions: TransitionRegistry;

  /** dependency를 안정적으로 보관하며 생략된 값에는 기본 singleton 기반을 사용한다. */
  constructor(options: StartOperationsOptions = {}) {
    this.#store = options.store ?? StartStore;
    this.#queue = options.queue ?? new OperationTargetQueue();
    this.#transitions = options.transitions ?? new TransitionRegistry();
  }

  /** serializable Action을 Start 목록 queue에 넣고 즉시 Handle을 반환한다. */
  execute(action: StartAction): StartOperationHandle {
    return this.#queue.enqueue(START_OPERATION_TARGET, (context) => this.#run(action, context));
  }

  /** Start Store 명령을 선택해 optional commit context와 함께 실행한다. */
  #executeStore(action: StartAction, context: StartStoreCommandContext): Promise<StartStoreResult> {
    switch (action.type) {
      case "pin":
        return this.#store.pin(action.resource, context);
      case "unpin":
        return this.#store.unpin(action.resource, context);
      case "reorder":
        return this.#store.reorder(action.resource, action.intent, context);
    }
  }

  /** 한 Action의 사전 transition, commit, 후속 transition과 저장 완료를 조율한다. */
  async #run(
    action: StartAction,
    context: OperationExecutionContext<
      typeof START_OPERATION_TARGET,
      StartCommittedResult,
      StartPresentedResult
    >,
  ): Promise<StartSettledResult> {
    const before: TransitionResult[] = [];
    const shouldExit = action.type === "unpin" && this.#store.isPinned(action.resource);
    const reorder = action.type === "reorder" && shouldReorder(this.#store.getSnapshot(), action);

    if (shouldExit) {
      before.push(await this.#transitions.waitFor(context.operationId, "start-item-exit"));
    } else if (reorder) {
      before.push(
        await this.#transitions.waitFor(context.operationId, "start-reorder-measure-before"),
      );
    }

    let committed = false;
    const transition = { afterCommit: null as Promise<TransitionResult[]> | null };
    const storeResult = await this.#executeStore(action, {
      onCommit: (value) => {
        committed = true;
        context.completeCommitted(Object.freeze({ status: "committed", value }));
        if (action.type === "pin") {
          transition.afterCommit = Promise.all([
            this.#transitions.waitFor(context.operationId, "start-item-enter"),
          ]);
        } else if (reorder) {
          transition.afterCommit = (async () => {
            const measured = await this.#transitions.waitFor(
              context.operationId,
              "start-reorder-measure-after",
            );
            const moved = await this.#transitions.waitFor(
              context.operationId,
              "start-reorder-move",
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
