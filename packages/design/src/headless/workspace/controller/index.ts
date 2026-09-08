/**
 * @file Workspace Store snapshot과 WorkspaceAction gateway를 React controller로 연결한다.
 *
 * Workspace 복원·reconcile·저장은 Store가 소유하며 hook은 snapshot을 복제하지 않는다.
 */
import { useMemo, useSyncExternalStore } from "react";

import { type ControllerViewModel, useHeadlessRuntime } from "../../runtime/index.js";
import type { WorkspaceState } from "../model/index.js";
import type { WorkspaceAction, WorkspaceOperationHandle } from "../operations/index.js";

/** SSR 준비 전 상태 또는 현재 Workspace Store snapshot을 제공하는 읽기 모델이다. */
export type WorkspaceControllerViewModel = ControllerViewModel<WorkspaceState>;

/** Workspace 제품 root가 사용할 serializable Action 진입점이다. */
export type WorkspaceControllerActions = Readonly<{
  /** WorkspaceAction을 Store 명령 queue에 연결하고 저장까지 구분하는 Handle을 반환한다. */
  execute(action: WorkspaceAction): WorkspaceOperationHandle;
}>;

/** Workspace 읽기 모델과 mutation 진입점을 분리해 제공하는 controller 결과다. */
export type WorkspaceController = Readonly<{
  /** Store가 소유한 immutable Workspace snapshot의 준비 상태다. */
  viewModel: WorkspaceControllerViewModel;
  /** Folder 생성·이름 변경·Resource 이동 Action 진입점이다. */
  actions: WorkspaceControllerActions;
}>;

/**
 * Workspace Store를 `useSyncExternalStore`로 구독하고 안정적인 Action 묶음을 반환한다.
 *
 * SSR에서는 storage를 읽지 않고 hydration과 같은 `not-ready` 값을 사용한다.
 */
export const useWorkspaceController = (): WorkspaceController => {
  const runtime = useHeadlessRuntime();
  const viewModel = useSyncExternalStore(
    runtime.workspace.subscribe,
    runtime.workspace.getSnapshot,
    runtime.workspace.getServerSnapshot,
  );
  const actions = useMemo<WorkspaceControllerActions>(
    () =>
      Object.freeze({
        execute: (action: WorkspaceAction) => runtime.workspace.execute(action),
      }),
    [runtime],
  );

  return useMemo(() => Object.freeze({ viewModel, actions }), [actions, viewModel]);
};
