"use client";

import type { PropsWithChildren } from "react";

import type { WindowItem } from "@window/ui";

import { WindowsItemsContext } from "./context";
import { useWindowsItemsValue } from "./hooks/useWindowsItemsValue";

export { useWindowsItemsContext } from "./hooks/useWindowsItemsContext";

interface WindowsItemsProviderProps extends PropsWithChildren {
  windowsItems: readonly WindowItem[];
}

/** Value hook과 Context를 조립해 앱의 WindowItem을 Windows 하위 기능에 전달한다. */
export const WindowsItemsProvider = ({ children, windowsItems }: WindowsItemsProviderProps) => {
  const value = useWindowsItemsValue(windowsItems);

  return <WindowsItemsContext.Provider value={value}>{children}</WindowsItemsContext.Provider>;
};
