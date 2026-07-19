"use client";

import type { PropsWithChildren } from "react";
import { useEffect, useRef } from "react";

import type { WindowItem } from "@window/ui";

import { useWindowsEventsContext } from "../windowsEventsProvider/hooks/useWindowsEventsContext";
import { WindowsItemsContext } from "./context";

interface WindowsItemsProviderProps extends PropsWithChildren {
  windowsItems: readonly WindowItem[];
}

/** 앱 prop을 source of truth로 사용하고 참조 변경을 Windows event로 전달한다. */
export const WindowsItemsProvider = ({ children, windowsItems }: WindowsItemsProviderProps) => {
  const { emitStateEvent } = useWindowsEventsContext();
  const previousWindowsItemsRef = useRef(windowsItems);

  useEffect(() => {
    const previousItems = previousWindowsItemsRef.current;

    if (Object.is(previousItems, windowsItems)) {
      return;
    }

    previousWindowsItemsRef.current = windowsItems;
    emitStateEvent("windowsItemsUpdated", { items: windowsItems, previousItems });
  }, [emitStateEvent, windowsItems]);

  return (
    <WindowsItemsContext.Provider value={windowsItems}>{children}</WindowsItemsContext.Provider>
  );
};
