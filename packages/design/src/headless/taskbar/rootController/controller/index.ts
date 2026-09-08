/**
 * @file Taskbar Root의 DOM-free mode projection을 React external-store 구독에 연결한다.
 *
 * Window 상태 계산, viewport 판정과 실제 Taskbar DOM은 이 controller가 소유하지 않는다.
 */
import { useMemo, useSyncExternalStore } from "react";

import { useHeadlessRuntime } from "../../../runtime/index.js";
import {
  createMobileTaskbarApplicationIntent,
  executeTaskbarWindowOperationIntent,
} from "../../actions/index.js";
import {
  selectTaskbarRootSnapshot,
  type TaskbarRootController,
  type TaskbarRootControllerActions,
  type TaskbarRootViewModel,
} from "../model/index.js";

/**
 * Window runtime을 `useSyncExternalStore`로 구독해 Taskbar Root mode를 제공한다.
 *
 * Application이 결정한 WindowState.mode만 소비하며 DOM, matchMedia 또는 viewport adapter를 만들지 않는다.
 */
export const useTaskbarRootController = (): TaskbarRootController => {
  const runtime = useHeadlessRuntime();
  const windows = useSyncExternalStore(
    runtime.windows.subscribe,
    runtime.windows.getSnapshot,
    runtime.windows.getServerSnapshot,
  );
  const viewModel = useMemo<TaskbarRootViewModel>(
    () =>
      windows.status === "ready"
        ? Object.freeze({
            status: "ready",
            snapshot: selectTaskbarRootSnapshot(windows.snapshot),
          })
        : Object.freeze({ status: "not-ready", snapshot: null }),
    [windows],
  );

  const actions = useMemo<TaskbarRootControllerActions>(
    () =>
      Object.freeze({
        execute: runtime.taskbarRoot.execute,
        launchMobileApplication: (applicationId) => {
          executeTaskbarWindowOperationIntent(
            createMobileTaskbarApplicationIntent(applicationId),
            runtime.windows,
          );
        },
      }),
    [runtime],
  );

  return useMemo(() => Object.freeze({ actions, viewModel }), [actions, viewModel]);
};
