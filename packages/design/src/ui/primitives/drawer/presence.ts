import { useLayoutEffect, useRef } from "react";

import type { PresenceState } from "../context-menu/types";

type PresenceCallback = ((state: PresenceState) => void) | undefined;

export const usePresenceNotifications = (open: boolean, onPresenceChange: PresenceCallback) => {
  const callbackRef = useRef(onPresenceChange);
  const previousOpenRef = useRef<boolean | null>(null);

  callbackRef.current = onPresenceChange;

  useLayoutEffect(() => {
    const previousOpen = previousOpenRef.current;

    if (open) {
      callbackRef.current?.("entering");
    } else if (previousOpen) {
      callbackRef.current?.("exiting");
    } else if (previousOpen === null) {
      callbackRef.current?.("unmounted");
    }

    previousOpenRef.current = open;
  }, [open]);

  return (completedOpen: boolean) => {
    callbackRef.current?.(completedOpen ? "present" : "unmounted");
  };
};
