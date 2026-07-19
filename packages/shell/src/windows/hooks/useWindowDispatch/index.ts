"use client";

import { useContext } from "react";

import { WindowsEventsContext } from "../../providers/windowsEventsProvider/context";
import type { WindowDispatch } from "../../types";

/**
 * Provider state 변경이 없는 Window event를 발생시키는 typed dispatch를 반환한다.
 *
 * @returns windowOpen, windowOpenLocation, windowContextMenuRequested 전용 dispatch
 */
export const useWindowDispatch = (): WindowDispatch => {
  const context = useContext(WindowsEventsContext);

  if (context === null) {
    throw new Error("useWindowDispatch는 Windows 안에서 사용해야 합니다.");
  }

  return context.dispatch;
};
