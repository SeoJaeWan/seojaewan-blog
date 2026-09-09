/**
 * @file desktop Group, Preview, ExternalShortcut와 mobile button을 explicit intent로 변환·실행한다.
 *
 * DOM, actual browser window, panel state와 analytics는 수행하지 않는다.
 */
import type {
  WindowAction,
  WindowOperationHandle,
  WindowStoreResult,
} from "../../windows/index.js";
import type { TaskbarApplicationId } from "../model/index.js";
import type {
  TaskbarApplicationGroup,
  TaskbarExternalShortcutView,
  TaskbarGroupTarget,
} from "../selectors/index.js";

export {
  createTaskbarSearchAction,
  createTaskbarWindowsAction,
  type TaskbarRootAction,
  type TaskbarRootActionGateway,
  type TaskbarSearchAction,
  type TaskbarWindowsAction,
} from "./rootAction/index.js";

/**
 * desktop application Group의 target 수와 active 상태에서 파생한 click intent다.
 */
export type TaskbarApplicationClickIntent =
  /**
   * target이 없을 때 application 기본 Window를 새로 여는 intent다.
   */
  | Readonly<{ type: "launch-default-application"; applicationId: TaskbarApplicationId }>
  /**
   * 유일한 target이 active일 때 exact Window를 최소화하는 intent다.
   */
  | Readonly<{ type: "minimize-window"; sessionId: TaskbarGroupTarget["sessionId"] }>
  /**
   * 유일한 target이 inactive 또는 minimized일 때 exact Window를 활성화하는 intent다.
   */
  | Readonly<{ type: "activate-window"; sessionId: TaskbarGroupTarget["sessionId"] }>
  /**
   * target이 둘 이상일 때 Window 변경 없이 Preview를 여는 intent다.
   */
  | Readonly<{ type: "open-preview"; applicationId: TaskbarApplicationId }>;

/**
 * 현재 Catalog URL을 새 browser context에 열도록 Application에 전달하는 intent다.
 */
export type TaskbarExternalShortcutIntent = Readonly<{
  type: "open-external-shortcut";
  url: string;
  target: "_blank";
}>;

/**
 * operation 시작 시 캡처한 application WindowSession ID를 한 번씩 닫는 intent다.
 */
export type TaskbarCloseAllIntent = Readonly<{
  type: "close-windows";
  sessionIds: readonly TaskbarGroupTarget["sessionId"][];
}>;

/**
 * mobile 고정 application 버튼을 WindowStore의 전용 교체 명령에 연결하는 intent다.
 */
export type MobileTaskbarApplicationIntent = Readonly<{
  type: "launch-mobile-application";
  applicationId: TaskbarApplicationId;
}>;

/**
 * headless가 WindowStore command port로 직접 실행할 수 있는 intent 집합이다.
 */
export type TaskbarWindowIntent =
  | Exclude<TaskbarApplicationClickIntent, { type: "open-preview" }>
  | TaskbarCloseAllIntent
  | MobileTaskbarApplicationIntent;

/**
 * Taskbar Window intent 실행에 필요한 기존 WindowStore public command의 최소 port다.
 */
export type TaskbarWindowCommandPort = Readonly<{
  /**
   * Desktop 위치의 기본 File Explorer Window를 만든다.
   */
  createFileExplorerWindow(location: null): Promise<WindowStoreResult>;
  /**
   * new-tab 기본 Chrome Window를 만든다.
   */
  createChromeWindow(): Promise<WindowStoreResult>;
  /**
   * exact WindowSession을 restore·activate한다.
   */
  activate(sessionId: TaskbarGroupTarget["sessionId"]): Promise<WindowStoreResult>;
  /**
   * exact active WindowSession을 최소화한다.
   */
  minimize(sessionId: TaskbarGroupTarget["sessionId"]): Promise<WindowStoreResult>;
  /**
   * exact WindowSession을 닫는다.
   */
  close(sessionId: TaskbarGroupTarget["sessionId"]): Promise<WindowStoreResult>;
  /**
   * mobile same-app no-op 또는 other-app 기본 창 교체를 실행한다.
   */
  launchMobileApplication(applicationId: TaskbarApplicationId): Promise<WindowStoreResult>;
}>;

/**
 * 단일 Window command 또는 close-all의 순차 command 결과다.
 */
export type TaskbarWindowIntentResult = WindowStoreResult | readonly WindowStoreResult[];

/** Taskbar Window intent를 Session Operation으로 실행하는 최소 port다. */
export type TaskbarWindowOperationPort = Readonly<{
  execute(action: WindowAction): WindowOperationHandle;
}>;

/** 단일 Window Handle 또는 close-all이 각 Session queue에 보낸 Handle 목록이다. */
export type TaskbarWindowOperationIntentResult =
  WindowOperationHandle | readonly WindowOperationHandle[];

/**
 * desktop application Group의 0/1/many target click을 launch, minimize, activate, preview intent로 만든다.
 */
export const createTaskbarApplicationClickIntent = (
  group: TaskbarApplicationGroup,
): TaskbarApplicationClickIntent => {
  if (group.targets.length === 0) {
    return Object.freeze({
      type: "launch-default-application",
      applicationId: group.applicationId,
    });
  }
  if (group.targets.length > 1) {
    return Object.freeze({ type: "open-preview", applicationId: group.applicationId });
  }
  const target = group.targets[0];
  if (target === undefined) {
    return Object.freeze({
      type: "launch-default-application",
      applicationId: group.applicationId,
    });
  }
  return target.active
    ? Object.freeze({ type: "minimize-window", sessionId: target.sessionId })
    : Object.freeze({ type: "activate-window", sessionId: target.sessionId });
};

/**
 * Preview target 선택을 exact WindowSession activate intent로 만든다.
 */
export const createTaskbarPreviewClickIntent = (target: TaskbarGroupTarget): TaskbarWindowIntent =>
  Object.freeze({ type: "activate-window", sessionId: target.sessionId });

/**
 * ExternalShortcut의 현재 URL을 `_blank` browser intent로 만든다.
 */
export const createTaskbarExternalShortcutIntent = (
  shortcut: TaskbarExternalShortcutView,
): TaskbarExternalShortcutIntent =>
  Object.freeze({ type: "open-external-shortcut", url: shortcut.url, target: "_blank" });

/**
 * application Group의 현재 target ID를 operation 시작 시 immutable close-all snapshot으로 만든다.
 */
export const createTaskbarCloseAllIntent = (
  group: TaskbarApplicationGroup,
): TaskbarCloseAllIntent =>
  Object.freeze({
    type: "close-windows",
    sessionIds: Object.freeze(group.targets.map(({ sessionId }) => sessionId)),
  });

/**
 * mobile application 버튼을 TASK-001 WindowStore 전용 launcher intent로 만든다.
 */
export const createMobileTaskbarApplicationIntent = (
  applicationId: TaskbarApplicationId,
): MobileTaskbarApplicationIntent =>
  Object.freeze({ type: "launch-mobile-application", applicationId });

/**
 * Taskbar Window intent를 기존 WindowStore command port에 전달한다.
 *
 * close-all은 intent에 이미 캡처된 ID를 순서대로 정확히 한 번씩 닫고 중간 Window 변화로 대상을 늘리지 않는다.
 */
export const executeTaskbarWindowIntent = async (
  intent: TaskbarWindowIntent,
  windowCommands: TaskbarWindowCommandPort,
): Promise<TaskbarWindowIntentResult> => {
  switch (intent.type) {
    case "launch-default-application":
      return intent.applicationId === "file-explorer"
        ? windowCommands.createFileExplorerWindow(null)
        : windowCommands.createChromeWindow();
    case "minimize-window":
      return windowCommands.minimize(intent.sessionId);
    case "activate-window":
      return windowCommands.activate(intent.sessionId);
    case "launch-mobile-application":
      return windowCommands.launchMobileApplication(intent.applicationId);
    case "close-windows": {
      const results: WindowStoreResult[] = [];
      for (const sessionId of intent.sessionIds) {
        results.push(await windowCommands.close(sessionId));
      }
      return Object.freeze(results);
    }
  }
};

/**
 * Taskbar Window intent를 Foundation Window Operation에 전달한다.
 *
 * close-all은 시작 시 캡처된 각 Session ID를 자기 queue에 한 번씩 보내며 다른 queue의 완료를 내부에서 기다리지 않는다.
 */
export const executeTaskbarWindowOperationIntent = (
  intent: TaskbarWindowIntent,
  operations: TaskbarWindowOperationPort,
): TaskbarWindowOperationIntentResult => {
  switch (intent.type) {
    case "launch-default-application":
      return operations.execute(
        intent.applicationId === "file-explorer"
          ? { type: "create-file-explorer-window", location: null }
          : { type: "create-chrome-window" },
      );
    case "minimize-window":
      return operations.execute({ type: "minimize", sessionId: intent.sessionId });
    case "activate-window":
      return operations.execute({ type: "activate", sessionId: intent.sessionId });
    case "launch-mobile-application":
      return operations.execute({
        type: "launch-mobile-application",
        applicationId: intent.applicationId,
      });
    case "close-windows":
      return Object.freeze(
        intent.sessionIds.map((sessionId) => operations.execute({ type: "close", sessionId })),
      );
  }
};
