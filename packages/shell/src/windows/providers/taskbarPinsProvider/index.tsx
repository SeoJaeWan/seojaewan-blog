"use client";

import type { PropsWithChildren } from "react";

import { TaskbarPinsContext } from "./context";
import { useTaskbarPinsValue } from "./hooks/useTaskbarPinsValue";

export { useTaskbarPins } from "./hooks/useTaskbarPins";
export type { UseTaskbarPins } from "./types";

/** Taskbar pin의 완성된 state와 action을 Windows 하위에 제공한다. */
export const TaskbarPinsProvider = ({ children }: PropsWithChildren) => {
  const value = useTaskbarPinsValue();

  return <TaskbarPinsContext.Provider value={value}>{children}</TaskbarPinsContext.Provider>;
};
