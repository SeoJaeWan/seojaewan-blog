import { useCallback, useEffect, useRef } from "react";

import type {
  WindowControllerActions,
  WindowSessionId,
} from "../../../../../../../headless/windows/index.js";

/**
 * 같은 pointer와 focus 연속 입력이 Window 활성화 Action을 중복 예약하지 않게 한다.
 */
export const useWindowActivation = (
  actions: WindowControllerActions,
  active: boolean,
  sessionId: WindowSessionId,
) => {
  const activationRequested = useRef(false);

  useEffect(() => {
    if (active) activationRequested.current = false;
  }, [active]);

  return useCallback(() => {
    if (active || activationRequested.current) return;
    activationRequested.current = true;
    actions.execute({ type: "activate", sessionId });
  }, [actions, active, sessionId]);
};
