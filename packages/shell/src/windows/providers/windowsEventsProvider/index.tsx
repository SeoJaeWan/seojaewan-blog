"use client";

import type { PropsWithChildren } from "react";
import { useMemo, useState } from "react";

import { WindowsEventsContext } from "./context";
import type { WindowsEventsContextValue } from "./types";
import { createWindowEventRegistry } from "./utils/createWindowEventRegistry";

export { useWindowDispatch } from "./hooks/useWindowDispatch";
export { useWindowEvent } from "./hooks/useWindowEvent";
export { useWindowsEventsContext } from "./hooks/useWindowsEventsContext";

/** Windows observer registry와 내부·외부 event 발행 계약을 제공한다. */
export const WindowsEventsProvider = ({ children }: PropsWithChildren) => {
  const [eventRegistry] = useState(createWindowEventRegistry);

  const value = useMemo<WindowsEventsContextValue>(
    () => ({ dispatch: eventRegistry.emit, subscribe: eventRegistry.subscribe }),
    [eventRegistry],
  );

  return <WindowsEventsContext.Provider value={value}>{children}</WindowsEventsContext.Provider>;
};
