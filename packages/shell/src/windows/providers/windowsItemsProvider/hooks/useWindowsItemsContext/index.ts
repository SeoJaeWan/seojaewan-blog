"use client";

import { useContext } from "react";

import { WindowsItemsContext } from "../../context";

/** Windows 내부 Provider와 hook이 현재 WindowItem을 읽을 때 사용한다. */
export const useWindowsItemsContext = () => {
  const context = useContext(WindowsItemsContext);

  if (context === null) {
    throw new Error("useWindowsItemsContext는 WindowsItemsProvider 안에서 사용해야 합니다.");
  }

  return context;
};
