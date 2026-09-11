import { useCallback, useEffect, useRef } from "react";

import {
  PRIMARY_PANEL_ENTER_PHASE,
  PRIMARY_PANEL_EXIT_PHASE,
  type PrimaryPanelControllerActions,
  type PrimaryPanelOperationHandle,
} from "../../../../../../../headless/index.js";

type PendingOperation = Readonly<{
  handle: PrimaryPanelOperationHandle;
}>;

/**
 * Panel operation ID와 widget transition 완료·취소 callback의 연결 생명주기를 소유한다.
 */
export const usePrimaryPanelTransitionRegistry = (actions: PrimaryPanelControllerActions) => {
  const pendingRef = useRef(
    new Map<PrimaryPanelOperationHandle["operationId"], PendingOperation>(),
  );
  const unmountedRef = useRef(false);

  /**
   * Unmount 뒤 남은 exact exit 또는 enter waiter를 중단한다.
   */
  const abortUnmountedOperations = useCallback((): void => {
    for (const { handle } of pendingRef.current.values()) {
      const exitAborted = actions.abortTransition(
        handle.operationId,
        PRIMARY_PANEL_EXIT_PHASE,
        "taskbar-panels-connection-unmounted",
      );
      const enterAborted = actions.abortTransition(
        handle.operationId,
        PRIMARY_PANEL_ENTER_PHASE,
        "taskbar-panels-connection-unmounted",
      );
      if (exitAborted || enterAborted) setTimeout(abortUnmountedOperations, 0);
    }
  }, [actions]);

  /**
   * Handle을 completion 후보에 등록하고 settled 뒤 exact ID만 제거한다.
   */
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

  /**
   * 실제 callback 방향과 registry waiter가 모두 맞는 첫 operation을 완료한다.
   */
  const completeTransition = useCallback(
    (open: boolean): void => {
      const phase = open ? PRIMARY_PANEL_ENTER_PHASE : PRIMARY_PANEL_EXIT_PHASE;
      for (const { handle } of pendingRef.current.values()) {
        if (actions.completeTransition(handle.operationId, phase)) return;
      }
    },
    [actions],
  );

  /**
   * Widget이 중단한 현재 방향의 exact transition만 abort한다.
   */
  const cancelTransition = useCallback(
    (open: boolean): void => {
      const phase = open ? PRIMARY_PANEL_ENTER_PHASE : PRIMARY_PANEL_EXIT_PHASE;
      for (const { handle } of pendingRef.current.values()) {
        if (
          actions.abortTransition(
            handle.operationId,
            phase,
            "taskbar-panel-widget-transition-cancelled",
          )
        ) {
          return;
        }
      }
    },
    [actions],
  );

  useEffect(() => {
    unmountedRef.current = false;
    return () => {
      unmountedRef.current = true;
      abortUnmountedOperations();
    };
  }, [abortUnmountedOperations]);

  return { cancelTransition, completeTransition, trackOperation } as const;
};
