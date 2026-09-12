/**
 * @file Search 실제 open 완료를 recent와 해당 primary panel activation에 연결한다.
 *
 * Component unmount는 실행을 취소하지 않으며 browser navigation과 Window semantic은 기존 port가 소유한다.
 */
import type { ResourceRef } from "../../../resources/index.js";
import type { WorkspaceState } from "../../../workspace/index.js";
import type {
  PrimaryPanelAction,
  PrimaryPanelId,
  PrimaryPanelOperationHandle,
} from "../../primaryPanel/index.js";
import {
  type ResourceOpenAction,
  type ResourceOpenResult,
  selectSearchResourceOpenTarget,
} from "../../resourceOpen/index.js";
import type { SearchResourceReader } from "../model/index.js";
import type { TaskbarSearchStore } from "../store/index.js";

/**
 * Search 목록·recent·추천과 detail이 실행할 대상 open Action이다.
 *
 * 파일 위치는 실행 시 Workspace에서 다시 조회하며 UI가 성공 여부를 전달하지 않는다.
 */
export type SearchOpenAction = Readonly<{
  panel: PrimaryPanelId;
  resource: ResourceRef;
}> &
  (Readonly<{ type: "search.open-resource" }> | Readonly<{ type: "search.open-file-location" }>);

/**
 * 실제 open 결과와 원래 ResourceRef를 함께 보존하는 Search 실행 결과다.
 *
 * 저장 실패는 성공 판정에 포함하지 않고 caller가 실패 안내를 만들 필요가 없다.
 */
export type SearchOpenResult =
  /**
   * pending 입력·준비 전·없는 대상은 port 실행 없이 보존한다.
   */
  | Readonly<{
      status: "not-executed";
      reason: "pending-query" | "not-ready" | "panel-not-active" | "resource-not-found";
      resource: ResourceRef;
    }>
  /**
   * 실제 open 실패로 panel·query·detail과 recent를 보존한다.
   */
  | Readonly<{ status: "failed"; resource: ResourceRef; openResult: ResourceOpenResult }>
  /**
   * 실제 open이 성공했으며 recent는 열린 ref, Desktop이면 null이다.
   */
  | Readonly<{
      status: "succeeded";
      resource: ResourceRef;
      recentResource: ResourceRef | null;
      openResult: ResourceOpenResult;
    }>;

/**
 * Search 실행에서 사용하는 Store, 현재 Workspace와 기존 open·panel Operation port다.
 *
 * UI callback으로 완료를 꾸미지 않고 Operation의 결과를 직접 기다린다.
 */
export type TaskbarSearchOperationsOptions = Readonly<{
  store: TaskbarSearchStore;
  resources: SearchResourceReader;
  workspace: Readonly<{ getSnapshot(): WorkspaceState }>;
  resourceOpen: Readonly<{ execute(action: ResourceOpenAction): Promise<ResourceOpenResult> }>;
  primaryPanel: Readonly<{ execute(action: PrimaryPanelAction): PrimaryPanelOperationHandle }>;
}>;

/**
 * 성공 기록을 UI 수명과 분리하고 close만 현재 activation에 제한하는 Search Operation이다.
 *
 * 저장 port의 완료·실패를 Resource open 성공에 결합하지 않는다.
 */
export class TaskbarSearchOperations {
  readonly #options: TaskbarSearchOperationsOptions;
  #requestSequence = 0;

  /**
   * 실제 Store·Operation port를 보관하고 실행 전에는 reader를 읽지 않는다.
   */
  constructor(options: TaskbarSearchOperationsOptions) {
    this.#options = options;
  }

  /**
   * 요청을 activation에 연결하고 최신 대상의 실제 open 완료 뒤 기록과 panel settle을 분리한다.
   */
  async execute(action: SearchOpenAction): Promise<SearchOpenResult> {
    const { store, resources, primaryPanel, resourceOpen, workspace } = this.#options;
    const resource = Object.freeze({ ...action.resource });
    if (store.getSnapshot().panels[action.panel].pending)
      return Object.freeze({ status: "not-executed", reason: "pending-query", resource });
    if (resources.getReaders() === null)
      return Object.freeze({ status: "not-executed", reason: "not-ready", resource });
    const requestId = `taskbar-search:${++this.#requestSequence}`;
    const tracked = await primaryPanel.execute({
      type: "track-resource-open",
      panel: action.panel,
      requestId,
    }).settled;
    if (tracked.status !== "settled" || tracked.result.status !== "tracked")
      return Object.freeze({ status: "not-executed", reason: "panel-not-active", resource });
    const readers = resources.getReaders();
    const pending = store.getSnapshot().panels[action.panel].pending;
    const target =
      readers === null || pending
        ? null
        : selectSearchResourceOpenTarget(resource, readers, workspace.getSnapshot(), action.type);
    if (target === null) {
      void primaryPanel.execute({ type: "settle-resource-open", requestId, outcome: "failed" });
      return Object.freeze({
        status: "not-executed",
        reason: pending ? "pending-query" : readers === null ? "not-ready" : "resource-not-found",
        resource,
      });
    }
    // 명시적 초기화는 Application 책임이다. 복원 전 성공도 세션에 기록하고 이후 합친다.
    const openResult = await resourceOpen.execute(target.action);
    if (openResult.status === "succeeded" && target.recentResource !== null) {
      void store.recordOpened(target.recentResource);
    }
    // activation 검증은 close에만 적용하며 늦은 성공도 실제 열린 ref를 기록한다.
    void primaryPanel.execute({
      type: "settle-resource-open",
      requestId,
      outcome: openResult.status,
    });
    return openResult.status === "failed"
      ? Object.freeze({ status: "failed", resource, openResult })
      : Object.freeze({
          status: "succeeded",
          resource,
          recentResource: target.recentResource,
          openResult,
        });
  }
}
