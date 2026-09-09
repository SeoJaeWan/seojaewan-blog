/**
 * @file Taskbar primary panel controller와 panel widget callback을 제품 경계에서 연결한다.
 *
 * active identity와 전환 순서는 headless가 소유하고, 이 hook은 실제 widget completion을
 * 대기 중인 operation ID와 phase에만 전달한다.
 */
import { useCallback, useEffect, useMemo, useRef } from "react";

import {
  PRIMARY_PANEL_ENTER_PHASE,
  PRIMARY_PANEL_EXIT_PHASE,
  type PrimaryPanelDismissReason,
  type PrimaryPanelId,
  type PrimaryPanelOperationHandle,
  type PrimaryPanelResourceOpenRequestId,
  selectPrimaryPanelView,
  usePrimaryPanelController,
} from "../../../../../headless/taskbar/index.js";
import type { TaskbarPanelOpenChangeReason, TaskbarPanelWidgetProps } from "../widget/index.js";

/** panel widget에 그대로 전달할 controlled 제품 연결 props다. */
export type TaskbarPanelWidgetConnection = Pick<
  TaskbarPanelWidgetProps,
  "onOpenChange" | "onTransitionCancel" | "onTransitionComplete" | "open"
>;

/** Start와 Search가 공통으로 실행할 panel 제품 Action이다. */
export type TaskbarPanelConnectionActions = Readonly<{
  /** 현재 제품 정책에 따라 panel을 열거나 toggle·maintain·switch한다. */
  trigger(): PrimaryPanelOperationHandle;
  /** IME와 공백을 포함한 controlled query를 그대로 반영한다. */
  updateQuery(query: string): PrimaryPanelOperationHandle;
  /** UI가 판정한 실제 외부 이탈 원인으로 active panel을 닫는다. */
  dismiss(reason: PrimaryPanelDismissReason): PrimaryPanelOperationHandle;
}>;

/** 한 panel 제품 part가 소비하는 읽기 모델, Action과 widget 연결이다. */
export type TaskbarPanelConnection = Readonly<{
  panel: PrimaryPanelId;
  query: string;
  widget: TaskbarPanelWidgetConnection;
  actions: TaskbarPanelConnectionActions;
}>;

/** Search 결과의 실제 open 전후를 current activation에 연결하는 Action이다. */
export type TaskbarSearchResourceConnection = Readonly<{
  /** 실제 Resource open 전에 caller의 request ID를 현재 Search activation에 연결한다. */
  track(requestId: PrimaryPanelResourceOpenRequestId): PrimaryPanelOperationHandle;
  /** 실제 open 성공 또는 실패를 전달한다. 성공한 current request만 panel을 닫는다. */
  settle(
    requestId: PrimaryPanelResourceOpenRequestId,
    outcome: "succeeded" | "failed",
  ): PrimaryPanelOperationHandle;
}>;

/** Root가 Start와 Search에 나눠 전달할 전체 primary panel 제품 연결이다. */
export type TaskbarPanelsConnection = Readonly<{
  ready: boolean;
  start: TaskbarPanelConnection;
  search: TaskbarPanelConnection & Readonly<{ resource: TaskbarSearchResourceConnection }>;
  /** responsive mode가 mobile로 바뀌었을 때 open과 대기 중 desktop 요청을 정리한다. */
  dismissForMobile(): PrimaryPanelOperationHandle;
}>;

type PendingOperation = Readonly<{
  handle: PrimaryPanelOperationHandle;
}>;

/** widget 원인을 headless가 소유하는 실제 dismiss 원인으로 좁힌다. */
const resolveDismissReason = (
  reason: TaskbarPanelOpenChangeReason,
): PrimaryPanelDismissReason | null => {
  if (reason === "escape") return "escape";
  if (reason === "outside") return "outside-interaction";
  if (reason === "focus-out") return "focus-loss";
  return null;
};

/**
 * 하나의 controller와 pending operation 집합을 공유해 Start exit와 Search enter를 같은 ID에 연결한다.
 *
 * 호출자는 반환한 `start.widget`과 `search.widget`을 각 TaskbarPanelWidget에 전달한다.
 */
export const useTaskbarPanelsConnection = (): TaskbarPanelsConnection => {
  const controller = usePrimaryPanelController();
  const pendingRef = useRef(
    new Map<PrimaryPanelOperationHandle["operationId"], PendingOperation>(),
  );
  const unmountedRef = useRef(false);

  /** 현재 등록된 waiter 하나만 중단하고 switch의 다음 phase가 생기면 다시 정리한다. */
  const abortUnmountedOperations = useCallback((): void => {
    for (const { handle } of pendingRef.current.values()) {
      const exitAborted = controller.actions.abortTransition(
        handle.operationId,
        PRIMARY_PANEL_EXIT_PHASE,
        "taskbar-panels-connection-unmounted",
      );
      const enterAborted = controller.actions.abortTransition(
        handle.operationId,
        PRIMARY_PANEL_ENTER_PHASE,
        "taskbar-panels-connection-unmounted",
      );
      if (exitAborted || enterAborted) setTimeout(abortUnmountedOperations, 0);
    }
  }, [controller.actions]);

  /** Handle을 completion 후보에 등록하고 settled 뒤 exact ID만 제거한다. */
  const trackOperation = useCallback(
    (handle: PrimaryPanelOperationHandle): PrimaryPanelOperationHandle => {
      pendingRef.current.set(handle.operationId, Object.freeze({ handle }));
      void handle.settled.then(
        () => {
          pendingRef.current.delete(handle.operationId);
          if (unmountedRef.current) setTimeout(abortUnmountedOperations, 0);
        },
        () => {
          pendingRef.current.delete(handle.operationId);
          if (unmountedRef.current) setTimeout(abortUnmountedOperations, 0);
        },
      );
      return handle;
    },
    [abortUnmountedOperations],
  );

  /** 실제 callback 방향과 현재 registry waiter가 모두 맞는 첫 operation만 완료한다. */
  const completeTransition = useCallback(
    (open: boolean): void => {
      const phase = open ? PRIMARY_PANEL_ENTER_PHASE : PRIMARY_PANEL_EXIT_PHASE;
      for (const { handle } of pendingRef.current.values()) {
        if (controller.actions.completeTransition(handle.operationId, phase)) return;
      }
    },
    [controller.actions],
  );

  /** 반대 controlled 상태 또는 widget unmount가 중단한 현재 phase만 abort한다. */
  const cancelTransition = useCallback(
    (open: boolean): void => {
      const phase = open ? PRIMARY_PANEL_ENTER_PHASE : PRIMARY_PANEL_EXIT_PHASE;
      for (const { handle } of pendingRef.current.values()) {
        if (
          controller.actions.abortTransition(
            handle.operationId,
            phase,
            "taskbar-panel-widget-transition-cancelled",
          )
        )
          return;
      }
    },
    [controller.actions],
  );

  useEffect(() => {
    unmountedRef.current = false;
    return () => {
      unmountedRef.current = true;
      abortUnmountedOperations();
    };
  }, [abortUnmountedOperations]);

  const snapshot = controller.viewModel.snapshot;
  const startView = selectPrimaryPanelView(
    snapshot ?? { activePanel: null, startQuery: "", searchQuery: "" },
    "start",
  );
  const searchView = selectPrimaryPanelView(
    snapshot ?? { activePanel: null, startQuery: "", searchQuery: "" },
    "search",
  );

  /** panel별 Action과 Base UI callback mapping을 같은 immutable 연결로 만든다. */
  const createPanelConnection = useCallback(
    (panel: PrimaryPanelId, active: boolean, query: string): TaskbarPanelConnection => {
      const trigger = () => trackOperation(controller.actions.execute({ type: "trigger", panel }));
      const updateQuery = (nextQuery: string) =>
        trackOperation(
          controller.actions.execute({ type: "update-query", panel, query: nextQuery }),
        );
      const dismiss = (reason: PrimaryPanelDismissReason) =>
        trackOperation(controller.actions.execute({ type: "dismiss", panel, reason }));

      return Object.freeze({
        panel,
        query,
        widget: Object.freeze({
          open: active,
          onOpenChange: (nextOpen: boolean, reason: TaskbarPanelOpenChangeReason): void => {
            if (nextOpen || reason === "trigger") {
              trigger();
              return;
            }
            const dismissReason = resolveDismissReason(reason);
            if (dismissReason !== null) dismiss(dismissReason);
          },
          onTransitionCancel: cancelTransition,
          onTransitionComplete: completeTransition,
        }),
        actions: Object.freeze({ trigger, updateQuery, dismiss }),
      });
    },
    [cancelTransition, completeTransition, controller.actions, trackOperation],
  );

  return useMemo(() => {
    const start = createPanelConnection("start", startView.active, startView.query);
    const search = createPanelConnection("search", searchView.active, searchView.query);
    const resource = Object.freeze({
      track: (requestId: PrimaryPanelResourceOpenRequestId) =>
        trackOperation(controller.actions.execute({ type: "track-resource-open", requestId })),
      settle: (requestId: PrimaryPanelResourceOpenRequestId, outcome: "succeeded" | "failed") =>
        trackOperation(
          controller.actions.execute({ type: "settle-resource-open", requestId, outcome }),
        ),
    });

    return Object.freeze({
      ready: controller.viewModel.status === "ready",
      start,
      search: Object.freeze({ ...search, resource }),
      dismissForMobile: () =>
        trackOperation(controller.actions.execute({ type: "dismiss-for-mobile" })),
    });
  }, [
    controller.actions,
    controller.viewModel.status,
    createPanelConnection,
    searchView,
    startView,
    trackOperation,
  ]);
};
