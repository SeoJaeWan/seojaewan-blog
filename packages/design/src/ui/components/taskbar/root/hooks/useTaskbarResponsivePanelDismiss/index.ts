import { useEffect, useRef } from "react";

/**
 * Mobile 진입 시 desktop panel 정리를 요청한다. 초기 mobile 진입도 포함한다.
 * 같은 mode의 재렌더와 callback 교체에서는 요청을 반복하지 않는다.
 */
export const useTaskbarResponsivePanelDismiss = (
  mode: "desktop" | "mobile" | undefined,
  dismiss: () => unknown,
): void => {
  const previousModeRef = useRef<typeof mode>(undefined);
  useEffect(() => {
    const previousMode = previousModeRef.current;
    previousModeRef.current = mode;
    if (mode === "mobile" && previousMode !== "mobile") dismiss();
  }, [mode, dismiss]);
};
