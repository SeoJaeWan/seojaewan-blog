import { useEffect, useRef } from "react";

import type { PresenceState } from "../../contracts";

export const usePresenceNotifications = (
  open: boolean,
  onPresenceChange?: (state: PresenceState) => void,
) => {
  const previousOpen = useRef<boolean | undefined>(undefined);

  useEffect(() => {
    const isInitialRender = previousOpen.current === undefined;
    previousOpen.current = open;

    if (isInitialRender && !open) {
      return;
    }

    onPresenceChange?.(open ? "entering" : "exiting");

    const frame = requestAnimationFrame(() => {
      onPresenceChange?.(open ? "present" : "unmounted");
    });

    return () => cancelAnimationFrame(frame);
  }, [onPresenceChange, open]);
};
