/**
 * @file Workspace Action을 Store commit·persistence와 목록 단위 Operation queue에 연결한다.
 *
 * Folder와 placement 계산은 WorkspaceStore가 소유하며 이 요소는 별도 UI transition을 만들지 않는다.
 */
import type { FolderResourceRef, ResourceRef } from "../../resources/index.js";
import { type OperationHandle, OperationTargetQueue } from "../../runtime/index.js";
import type { WorkspaceState } from "../model/index.js";
import {
  WorkspaceStore,
  type WorkspaceStoreCommandContext,
  type WorkspaceStoreResult,
} from "../workspaceStore/index.js";

/** Workspace 변경 Operation이 공유하는 queue key다. */
export const WORKSPACE_OPERATION_TARGET = "workspace" as const;

/** Workspace 명령을 표현하는 serializable Action이다. */
export type WorkspaceAction =
  /** 새 Folder를 Desktop 또는 지정 Folder 아래 만든다. */
  | Readonly<{ type: "create-folder"; name: string; parent: FolderResourceRef | null }>
  /** 기존 Folder identity와 placement를 유지하며 이름을 바꾼다. */
  | Readonly<{ type: "rename-folder"; folder: FolderResourceRef; name: string }>
  /** 기존 Resource placement를 Desktop 또는 지정 Folder로 옮긴다. */
  | Readonly<{ type: "move-resource"; resource: ResourceRef; parent: FolderResourceRef | null }>;

/** Workspace semantic commit, no-op과 거절의 완료 결과다. */
export type WorkspaceCommittedResult =
  /** Store가 새 Workspace snapshot을 메모리에 반영했다. */
  | Readonly<{ status: "committed"; value: WorkspaceState }>
  /** 현재 상태가 요청을 이미 만족해 commit과 저장을 생략했다. */
  | Readonly<{ status: "no-op"; result: WorkspaceStoreResult }>
  /** 입력 또는 현재 Workspace 전제가 맞지 않아 상태를 바꾸지 않았다. */
  | Readonly<{ status: "rejected"; result: WorkspaceStoreResult }>;

/** Workspace 변경에는 별도 UI transition이 없음을 나타낸다. */
export type WorkspacePresentedResult = Readonly<{ status: "not-required" }>;

/** 저장 완료 또는 실패까지 포함한 Workspace Operation 결과다. */
export type WorkspaceSettledResult = Readonly<{
  status: "settled";
  storeResult: WorkspaceStoreResult;
  presentation: WorkspacePresentedResult;
}>;

/** Workspace Action의 commit, presentation과 전체 완료를 구분하는 Handle이다. */
export type WorkspaceOperationHandle = OperationHandle<
  WorkspaceCommittedResult,
  WorkspacePresentedResult,
  WorkspaceSettledResult
>;

/** Workspace Operation이 호출하는 Store public 명령의 최소 port다. */
export type WorkspaceOperationStore = Readonly<{
  createFolder(
    name: string,
    parent: FolderResourceRef | null,
    context?: WorkspaceStoreCommandContext,
  ): Promise<WorkspaceStoreResult>;
  renameFolder(
    folder: FolderResourceRef,
    name: string,
    context?: WorkspaceStoreCommandContext,
  ): Promise<WorkspaceStoreResult>;
  moveResource(
    resource: ResourceRef,
    parent: FolderResourceRef | null,
    context?: WorkspaceStoreCommandContext,
  ): Promise<WorkspaceStoreResult>;
}>;

/** Workspace Operation dependency를 선택적으로 교체하는 생성 옵션이다. */
export type WorkspaceOperationsOptions = Readonly<{
  store?: WorkspaceOperationStore;
  queue?: OperationTargetQueue<typeof WORKSPACE_OPERATION_TARGET>;
}>;

/** commit callback이 없었던 Store 결과를 no-op과 거절로 분류한다. */
const unchangedResult = (result: WorkspaceStoreResult): WorkspaceCommittedResult => {
  if (result.ok) return Object.freeze({ status: "rejected", result });
  return Object.freeze({ status: result.reason === "no-op" ? "no-op" : "rejected", result });
};

/** Workspace Store를 대상 단위 OperationHandle에 연결한다. */
export class WorkspaceOperations {
  readonly #store: WorkspaceOperationStore;
  readonly #queue: OperationTargetQueue<typeof WORKSPACE_OPERATION_TARGET>;

  /** 주입된 Store와 queue를 보관하며 생략하면 정적 WorkspaceStore를 사용한다. */
  constructor(options: WorkspaceOperationsOptions = {}) {
    this.#store = options.store ?? WorkspaceStore;
    this.#queue = options.queue ?? new OperationTargetQueue();
  }

  /** Action을 Workspace queue에 예약하고 즉시 완료 시점별 Handle을 반환한다. */
  execute(action: WorkspaceAction): WorkspaceOperationHandle {
    return this.#queue.enqueue(WORKSPACE_OPERATION_TARGET, async (context) => {
      let committed = false;
      const commandContext: WorkspaceStoreCommandContext = {
        onCommit: (value) => {
          committed = true;
          context.completeCommitted(Object.freeze({ status: "committed", value }));
        },
      };
      const storeResult = await this.#executeStore(action, commandContext);
      if (!committed) context.completeCommitted(unchangedResult(storeResult));
      const presentation = Object.freeze({ status: "not-required" } as const);
      context.completePresented(presentation);
      return Object.freeze({ status: "settled", storeResult, presentation });
    });
  }

  /** Action 종류에 맞는 기존 WorkspaceStore 명령을 호출한다. */
  #executeStore(
    action: WorkspaceAction,
    context: WorkspaceStoreCommandContext,
  ): Promise<WorkspaceStoreResult> {
    switch (action.type) {
      case "create-folder":
        return this.#store.createFolder(action.name, action.parent, context);
      case "rename-folder":
        return this.#store.renameFolder(action.folder, action.name, context);
      case "move-resource":
        return this.#store.moveResource(action.resource, action.parent, context);
    }
  }
}
