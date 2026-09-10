/**
 * @file Start screen transient snapshot과 serializable Action을 React controller로 연결한다.
 *
 * persisted Start Pin과 실제 scroll, focus, animation은 각각 기존 Start controller와 제품 UI가 소유한다.
 */
import { useMemo, useSyncExternalStore } from "react";

import { type ControllerViewModel, useHeadlessRuntime } from "../../../runtime/index.js";
import type { StartScreenSnapshot } from "../model/index.js";
import type { StartScreenAction, StartScreenOperationResult } from "../operations/index.js";

/** SSR 준비 전 상태 또는 현재 Start screen semantic snapshot이다. */
export type StartScreenControllerViewModel = ControllerViewModel<StartScreenSnapshot>;

/** Start 제품 Component와 panel lifecycle이 사용할 transient Action 묶음이다. */
export type StartScreenControllerActions = Readonly<{
  /** serializable Action을 runtime-local Start screen state에 전달한다. */
  execute(action: StartScreenAction): StartScreenOperationResult;
}>;

/** Start screen 읽기 모델과 mutation 진입점을 분리한 controller 결과다. */
export type StartScreenController = Readonly<{
  /** runtime-local transient state의 준비 상태와 immutable snapshot이다. */
  viewModel: StartScreenControllerViewModel;
  /** semantic view, index와 lifecycle reset Action을 실행한다. */
  actions: StartScreenControllerActions;
}>;

/** runtime의 독립 Start screen channel을 구독하고 안정적인 Action 묶음을 반환한다. */
export const useStartScreenController = (): StartScreenController => {
  const runtime = useHeadlessRuntime();
  const viewModel = useSyncExternalStore(
    runtime.startScreen.subscribe,
    runtime.startScreen.getSnapshot,
    runtime.startScreen.getServerSnapshot,
  );
  const actions = useMemo<StartScreenControllerActions>(
    () =>
      Object.freeze({
        execute: (action: StartScreenAction) => runtime.startScreen.execute(action),
      }),
    [runtime],
  );

  return useMemo(() => Object.freeze({ viewModel, actions }), [actions, viewModel]);
};
