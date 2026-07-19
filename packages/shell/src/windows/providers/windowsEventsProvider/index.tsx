"use client";

import type { PropsWithChildren } from "react";
import { useCallback, useMemo, useState } from "react";

import type { WindowDispatch } from "../../types";
import { WindowsEventsContext } from "./context";
import type { EmitWindowStateEvent, WindowsEventsContextValue } from "./types";
import { createWindowEventRegistry } from "./utils/createWindowEventRegistry";

/** Windows observer registry와 내부·외부 event 발행 계약을 제공한다. */
export const WindowsEventsProvider = ({ children }: PropsWithChildren) => {
  const [eventRegistry] = useState(createWindowEventRegistry);

  const dispatch = useCallback<WindowDispatch>(
    (eventName, payload) => {
      eventRegistry.emit(eventName, payload);
    },
    [eventRegistry],
  );

  const emitStateEvent = useMemo(() => eventRegistry.emit as EmitWindowStateEvent, [eventRegistry]);

  const value = useMemo<WindowsEventsContextValue>(
    () => ({ dispatch, emitStateEvent, subscribe: eventRegistry.subscribe }),
    [dispatch, emitStateEvent, eventRegistry],
  );

  return <WindowsEventsContext.Provider value={value}>{children}</WindowsEventsContext.Provider>;
};
