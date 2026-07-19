"use client";

import { useContext } from "react";

import { WindowsEventsContext } from "../../context";

/** Windows 내부 Provider가 event registry에 접근할 때 사용한다. */
export const useWindowsEventsContext = () => {
  const context = useContext(WindowsEventsContext);

  if (context === null) {
    throw new Error("useWindowsEventsContext는 WindowsEventsProvider 안에서 사용해야 합니다.");
  }

  return context;
};
