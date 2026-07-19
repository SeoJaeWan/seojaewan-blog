"use client";

import type { PropsWithChildren } from "react";

import { WindowsPinsContext } from "./context";
import { useWindowsPinsValue } from "./hooks/useWindowsPinsValue";

/** Windows pin의 완성된 state와 action을 Windows 하위에 제공한다. */
export const WindowsPinsProvider = ({ children }: PropsWithChildren) => {
  const value = useWindowsPinsValue();

  return <WindowsPinsContext.Provider value={value}>{children}</WindowsPinsContext.Provider>;
};
