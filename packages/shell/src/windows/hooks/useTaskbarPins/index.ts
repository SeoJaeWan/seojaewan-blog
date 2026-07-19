"use client";

import { useContext } from "react";

import { TaskbarPinsContext } from "../../providers/taskbarPinsProvider/context";
import type { UseTaskbarPins } from "../../providers/taskbarPinsProvider/types";

export type { UseTaskbarPins } from "../../providers/taskbarPinsProvider/types";

/** Windows가 제공하는 Taskbar pin state와 action을 반환한다. */
export const useTaskbarPins = (): UseTaskbarPins => {
  const context = useContext(TaskbarPinsContext);

  if (context === null) {
    throw new Error("useTaskbarPins는 Windows 안에서 사용해야 합니다.");
  }

  return context;
};
