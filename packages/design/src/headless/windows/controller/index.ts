/**
 * @file Window Store snapshot과 WindowAction gateway를 React controller로 연결한다.
 *
 * Window 상태 계산, DOM animation과 Store 초기화는 이 hook이 소유하지 않는다.
 */
import { useMemo, useSyncExternalStore } from "react";

import {
  type ControllerViewModel,
  type OperationId,
  type TransitionPhase,
  useHeadlessRuntime,
} from "../../runtime/index.js";
import type { WindowGestureRequest, WindowGestureStartResult } from "../gestures/index.js";
import type { WindowState } from "../model/index.js";
import type { WindowAction, WindowOperationHandle } from "../operations/index.js";

/** SSR 준비 전 상태 또는 현재 Window Store snapshot을 제공하는 읽기 모델이다. */
export type WindowControllerViewModel = ControllerViewModel<WindowState>;

/** Window 제품 Component가 호출할 수 있는 Action과 transition 완료 진입점이다. */
export type WindowControllerActions = Readonly<{
  /** serializable WindowAction을 대상 Session queue에 보내고 OperationHandle을 반환한다. */
  execute(action: WindowAction): WindowOperationHandle;
  /** move·resize gesture의 시작 frame을 캡처하고 update·종료·Esc rollback Handle을 반환한다. */
  beginGesture(request: WindowGestureRequest): WindowGestureStartResult;
  /** 현재 operation ID와 phase의 UI transition 정상 완료를 알린다. */
  completeTransition(operationId: OperationId, phase: TransitionPhase): boolean;
  /** Component 제거 등으로 현재 transition 대기가 중단됐음을 알린다. */
  abortTransition(operationId: OperationId, phase: TransitionPhase, reason: string): boolean;
  /** UI transition 실행 실패를 제품 거절과 구분해 알린다. */
  failTransition(operationId: OperationId, phase: TransitionPhase, error: unknown): boolean;
}>;

/** Window 읽기 모델과 mutation 진입점을 분리해 제공하는 controller 결과다. */
export type WindowController = Readonly<{
  /** Store가 소유한 immutable Window snapshot의 준비 상태다. */
  viewModel: WindowControllerViewModel;
  /** WindowAction 실행과 operation ID별 표현 완료 신호다. */
  actions: WindowControllerActions;
}>;

/**
 * Window Store를 `useSyncExternalStore`로 구독하고 안정적인 Action 묶음을 반환한다.
 *
 * 브라우저에서는 Store 초기화 뒤 사용한다. SSR과 hydration 첫 읽기는 사용자 singleton을
 * 초기화하지 않는 동일한 `not-ready` View Model을 사용한다.
 */
export const useWindowController = (): WindowController => {
  const runtime = useHeadlessRuntime();
  const viewModel = useSyncExternalStore(
    runtime.windows.subscribe,
    runtime.windows.getSnapshot,
    runtime.windows.getServerSnapshot,
  );
  const actions = useMemo<WindowControllerActions>(
    () =>
      Object.freeze({
        execute: (action: WindowAction) => runtime.windows.execute(action),
        beginGesture: (request: WindowGestureRequest) => runtime.windowGestures.begin(request),
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
