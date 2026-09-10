import { useEffect, useRef } from "react";

import type { TaskbarPanelWidgetProps } from "../../index.js";

/**
 * controlled open 값마다 완료 또는 중단 callback을 정확히 한 번 연결한다.
 */
export const useTaskbarPanelTransition = (
  open: boolean,
  onTransitionCancel: TaskbarPanelWidgetProps["onTransitionCancel"],
  onTransitionComplete: TaskbarPanelWidgetProps["onTransitionComplete"],
) => {
  const mountedRef = useRef(false);
  const pendingRef = useRef<boolean | null>(open ? true : null);
  const cancelRef = useRef(onTransitionCancel);
  const completeRef = useRef(onTransitionComplete);

  cancelRef.current = onTransitionCancel;
  completeRef.current = onTransitionComplete;

  useEffect(() => {
    if (!mountedRef.current) {
      mountedRef.current = true;
      return;
    }

    const pending = pendingRef.current;
    if (pending !== null && pending !== open) {
      cancelRef.current?.(pending);
    }
    pendingRef.current = open;
  }, [open]);

  useEffect(
    () => () => {
      const pending = pendingRef.current;
      if (pending !== null) {
        cancelRef.current?.(pending);
        pendingRef.current = null;
      }
    },
    [],
  );

  /**
   * Base UI가 관찰한 실제 CSS transition 완료를 현재 목표와 대조해 전달한다.
   */
  const complete = (completedOpen: boolean) => {
    if (pendingRef.current !== completedOpen) {
      return;
    }
    pendingRef.current = null;
    completeRef.current?.(completedOpen);
  };

  return complete;
};
