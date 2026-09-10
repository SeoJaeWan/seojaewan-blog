/**
 * @file Taskbar primary panel state와 Operation gateway를 React 제품 경계에 연결한다.
 *
 * focus, portal, presence와 animation 실행은 controller가 반환하지 않는다.
 */
import { useMemo, useSyncExternalStore } from "react";

import {
  type ControllerViewModel,
  type OperationId,
  type TransitionPhase,
  useHeadlessRuntime,
} from "../../../runtime/index.js";
import type { PrimaryPanelSnapshot } from "../model/index.js";
import type { PrimaryPanelAction, PrimaryPanelOperationHandle } from "../operations/index.js";

/** SSR 준비 전 상태 또는 현재 primary panel snapshot이다. */
export type PrimaryPanelControllerViewModel = ControllerViewModel<PrimaryPanelSnapshot>;

/** 제품 Component가 사용할 Action과 transition 완료 진입점이다. */
export type PrimaryPanelControllerActions = Readonly<{
  execute(action: PrimaryPanelAction): PrimaryPanelOperationHandle;
  completeTransition(operationId: OperationId, phase: TransitionPhase): boolean;
  abortTransition(operationId: OperationId, phase: TransitionPhase, reason: string): boolean;
  failTransition(operationId: OperationId, phase: TransitionPhase, error: unknown): boolean;
}>;

/** primary panel 읽기 모델과 mutation 진입점을 분리한 controller 결과다. */
export type PrimaryPanelController = Readonly<{
  viewModel: PrimaryPanelControllerViewModel;
  actions: PrimaryPanelControllerActions;
}>;

/** in-memory state를 구독하고 runtime identity 동안 안정적인 Action 묶음을 반환한다. */
export const usePrimaryPanelController = (): PrimaryPanelController => {
  const runtime = useHeadlessRuntime();
  const viewModel = useSyncExternalStore(
    runtime.primaryPanel.subscribe,
    runtime.primaryPanel.getSnapshot,
    runtime.primaryPanel.getServerSnapshot,
  );
  const actions = useMemo<PrimaryPanelControllerActions>(
    () =>
      Object.freeze({
        execute: (action: PrimaryPanelAction) => runtime.primaryPanel.execute(action),
        completeTransition: (operationId: OperationId, phase: TransitionPhase) =>
          runtime.transitions.complete(operationId, phase),
        abortTransition: (operationId: OperationId, phase: TransitionPhase, reason: string) =>
          runtime.transitions.abort(operationId, phase, reason),
        failTransition: (operationId: OperationId, phase: TransitionPhase, error: unknown) =>
          runtime.transitions.fail(operationId, phase, error),
      }),
    [runtime],
  );

  return useMemo(() => Object.freeze({ viewModel, actions }), [actions, viewModel]);
};
