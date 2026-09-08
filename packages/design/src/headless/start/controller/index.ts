/**
 * @file Start Pin snapshot과 StartAction gateway를 React controller로 연결한다.
 *
 * Pin 계산·저장과 실제 항목 animation은 각각 Store와 제품 Component가 소유한다.
 */
import { useMemo, useSyncExternalStore } from "react";

import {
  type ControllerViewModel,
  type OperationId,
  type TransitionPhase,
  useHeadlessRuntime,
} from "../../runtime/index.js";
import type { StartSnapshot } from "../model/index.js";
import type { StartAction, StartOperationHandle } from "../operations/index.js";

/** SSR 준비 전 상태 또는 현재 Start Store snapshot을 제공하는 읽기 모델이다. */
export type StartControllerViewModel = ControllerViewModel<StartSnapshot>;

/** Start 제품 Component가 사용할 Pin Action과 transition 완료 진입점이다. */
export type StartControllerActions = Readonly<{
  /** serializable StartAction을 목록 queue에 보내고 완료 단계별 Handle을 반환한다. */
  execute(action: StartAction): StartOperationHandle;
  /** 현재 operation ID와 phase의 항목 transition 정상 완료를 알린다. */
  completeTransition(operationId: OperationId, phase: TransitionPhase): boolean;
  /** Component 제거 등으로 현재 transition 대기가 중단됐음을 알린다. */
  abortTransition(operationId: OperationId, phase: TransitionPhase, reason: string): boolean;
  /** UI transition 실행 실패를 제품 거절과 구분해 알린다. */
  failTransition(operationId: OperationId, phase: TransitionPhase, error: unknown): boolean;
}>;

/** Start 읽기 모델과 mutation 진입점을 분리해 제공하는 controller 결과다. */
export type StartController = Readonly<{
  /** Store가 소유한 immutable Start Pin snapshot의 준비 상태다. */
  viewModel: StartControllerViewModel;
  /** Pin Action 실행과 operation ID별 표현 완료 신호다. */
  actions: StartControllerActions;
}>;

/**
 * Start Store를 `useSyncExternalStore`로 구독하고 안정적인 Action 묶음을 반환한다.
 *
 * 일반 React 구독 cleanup은 진행 중인 사용자 Operation을 중단하지 않는다.
 */
export const useStartController = (): StartController => {
  const runtime = useHeadlessRuntime();
  const viewModel = useSyncExternalStore(
    runtime.start.subscribe,
    runtime.start.getSnapshot,
    runtime.start.getServerSnapshot,
  );
  const actions = useMemo<StartControllerActions>(
    () =>
      Object.freeze({
        execute: (action: StartAction) => runtime.start.execute(action),
        completeTransition: (operationId: OperationId, phase: TransitionPhase) =>
          runtime.transitions.complete(operationId, phase),
        abortTransition: (
          operationId: OperationId,
          phase: TransitionPhase,
          reason: string,
        ) => runtime.transitions.abort(operationId, phase, reason),
        failTransition: (operationId: OperationId, phase: TransitionPhase, error: unknown) =>
          runtime.transitions.fail(operationId, phase, error),
      }),
    [runtime],
  );

  return useMemo(() => Object.freeze({ viewModel, actions }), [actions, viewModel]);
};
