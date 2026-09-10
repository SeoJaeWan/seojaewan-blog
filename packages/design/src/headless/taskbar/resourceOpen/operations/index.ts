/**
 * @file Taskbar Resource open intent를 Window Operation 또는 외부 새 탭 navigation에 연결한다.
 *
 * DOM, browser 전역과 panel 상태는 다루지 않으며 각 port가 명시적으로 완료한 결과만 분류한다.
 */
import type {
  WindowAction,
  WindowOperationHandle,
  WindowSettledResult,
} from "../../../windows/index.js";
import type { TaskbarExternalShortcutIntent } from "../../actions/index.js";

/** 내부 WindowSession으로 여는 Folder와 Content Action이다. */
export type ResourceOpenWindowAction = Extract<
  WindowAction,
  { type: "open-folder" | "open-content" }
>;

/** Taskbar surface에서 실행할 수 있는 Resource open intent다. */
export type ResourceOpenAction = ResourceOpenWindowAction | TaskbarExternalShortcutIntent;

/** 외부 새 탭 adapter가 호출 수락이 아니라 실제 navigation 요청 결과로 반환하는 값이다. */
export type ExternalShortcutNavigationResult =
  | Readonly<{ status: "succeeded" }>
  | Readonly<{ status: "failed"; reason: string; error?: unknown }>;

/** actual browser 새 탭을 여는 Application 주입 port다. */
export type ExternalShortcutNavigationPort = Readonly<{
  openNewTab(
    intent: TaskbarExternalShortcutIntent,
  ): ExternalShortcutNavigationResult | Promise<ExternalShortcutNavigationResult>;
}>;

/** Folder와 Content open을 기존 Window Operation에 전달하는 최소 port다. */
export type ResourceOpenWindowOperationPort = Readonly<{
  execute(action: ResourceOpenWindowAction): WindowOperationHandle;
}>;

/** Resource open 성공과 실패 원인을 caller가 panel outcome으로 변환할 수 있는 결과다. */
export type ResourceOpenResult =
  | Readonly<{
      status: "succeeded";
      kind: "window-committed" | "window-target-satisfied";
      action: ResourceOpenWindowAction;
      result: WindowSettledResult;
    }>
  | Readonly<{
      status: "succeeded";
      kind: "external-navigation-succeeded";
      action: TaskbarExternalShortcutIntent;
      result: Extract<ExternalShortcutNavigationResult, { status: "succeeded" }>;
    }>
  | Readonly<{
      status: "failed";
      kind: "window-rejected";
      action: ResourceOpenWindowAction;
      result: WindowSettledResult;
    }>
  | Readonly<{
      status: "failed";
      kind: "window-operation-failed";
      action: ResourceOpenWindowAction;
      result: unknown;
    }>
  | Readonly<{
      status: "failed";
      kind: "window-presentation-failed";
      action: ResourceOpenWindowAction;
      result: WindowSettledResult;
    }>
  | Readonly<{
      status: "failed";
      kind: "external-navigation-failed";
      action: TaskbarExternalShortcutIntent;
      result: Extract<ExternalShortcutNavigationResult, { status: "failed" }>;
    }>
  | Readonly<{
      status: "failed";
      kind: "external-navigation-threw";
      action: TaskbarExternalShortcutIntent;
      result: unknown;
    }>;

/** Resource open Operation의 Window와 external navigation dependency다. */
export type ResourceOpenOperationsOptions = Readonly<{
  windows: ResourceOpenWindowOperationPort;
  externalNavigation: ExternalShortcutNavigationPort;
}>;

/** Window와 actual browser의 명시적 완료 결과를 하나의 open outcome으로 분류한다. */
export class ResourceOpenOperations {
  readonly #windows: ResourceOpenWindowOperationPort;
  readonly #externalNavigation: ExternalShortcutNavigationPort;

  /** DOM-free port를 보관하며 실제 adapter 선택은 Application에 남긴다. */
  constructor(options: ResourceOpenOperationsOptions) {
    this.#windows = options.windows;
    this.#externalNavigation = options.externalNavigation;
  }

  /** Resource 종류별 port를 한 번 호출하고 완료 결과를 성공 또는 실패로 정규화한다. */
  execute(action: ResourceOpenAction): Promise<ResourceOpenResult> {
    return action.type === "open-external-shortcut"
      ? this.#openExternalShortcut(action)
      : this.#openWindowResource(action);
  }

  /** Window semantic 결과와 presentation 실패를 모두 확인한 뒤 open 성공을 확정한다. */
  async #openWindowResource(action: ResourceOpenWindowAction): Promise<ResourceOpenResult> {
    try {
      const result = await this.#windows.execute(action).settled;
      if (result.status === "failed") {
        return Object.freeze({ status: "failed", kind: "window-operation-failed", action, result });
      }
      if (!result.storeResult.ok) {
        return Object.freeze({ status: "failed", kind: "window-rejected", action, result });
      }
      if (result.presentation.status === "failed") {
        return Object.freeze({
          status: "failed",
          kind: "window-presentation-failed",
          action,
          result,
        });
      }
      return Object.freeze({
        status: "succeeded",
        kind: result.storeResult.changed ? "window-committed" : "window-target-satisfied",
        action,
        result,
      });
    } catch (result) {
      return Object.freeze({ status: "failed", kind: "window-operation-failed", action, result });
    }
  }

  /** 외부 사이트 상태를 조회하지 않고 adapter의 명시적 새 탭 결과만 사용한다. */
  async #openExternalShortcut(action: TaskbarExternalShortcutIntent): Promise<ResourceOpenResult> {
    try {
      const result = await this.#externalNavigation.openNewTab(action);
      return result.status === "succeeded"
        ? Object.freeze({
            status: "succeeded",
            kind: "external-navigation-succeeded",
            action,
            result,
          })
        : Object.freeze({
            status: "failed",
            kind: "external-navigation-failed",
            action,
            result,
          });
    } catch (result) {
      return Object.freeze({
        status: "failed",
        kind: "external-navigation-threw",
        action,
        result,
      });
    }
  }
}
