"use client";

import type { PropsWithChildren } from "react";

import { WindowPanelViewContext } from "./context";
import { useWindowPanelViewValue } from "./hooks/useWindowPanelViewValue";

/** Search 전환 동안에도 Pinned/All browse navigation 상태를 유지하는 내부 Root. */
const WindowPanelViewRoot = ({ children }: PropsWithChildren) => {
  const value = useWindowPanelViewValue();

  return (
    <WindowPanelViewContext.Provider value={value}>{children}</WindowPanelViewContext.Provider>
  );
};

/**
 * Window panel 내부의 Pinned/All browse navigation scope.
 * Trigger나 Content 합성 API 없이 고정된 child view가 private Context를 소비한다.
 */
export const WindowPanelView = {
  Root: WindowPanelViewRoot,
};
