"use client";

import { useContext, useEffect, useLayoutEffect, useRef } from "react";

import { WindowsControllerContext } from "../..";
import type { WindowEventListener, WindowEventName } from "../../types";

/**
 * Windows event 하나를 구독하고 unmount 또는 event name 변경 시 구독을 해제한다.
 *
 * @param eventName 구독할 flat event name
 * @param listener event payload를 받을 observer callback
 */
export const useWindowEvent = <Name extends WindowEventName>(
  eventName: Name,
  listener: WindowEventListener<Name>,
) => {
  const context = useContext(WindowsControllerContext);
  const listenerRef = useRef(listener);

  if (context === null) {
    throw new Error("useWindowEvent는 Windows 안에서 사용해야 합니다.");
  }

  useLayoutEffect(() => {
    listenerRef.current = listener;
  }, [listener]);

  useEffect(
    () => context.subscribe(eventName, (payload) => listenerRef.current(payload)),
    [context, eventName],
  );
};
