"use client";

import { useContext } from "react";

import { TaskbarPinsContext } from "../../context";
import type { UseTaskbarPins } from "../../types";

export type { UseTaskbarPins } from "../../types";

/** Windows가 제공하는 Taskbar pin state와 action을 반환한다. */
export const useTaskbarPins = (): UseTaskbarPins => {
  const context = useContext(TaskbarPinsContext);

  if (context === null) {
    throw new Error("useTaskbarPins는 Windows 안에서 사용해야 합니다.");
  }

  return context;
};
