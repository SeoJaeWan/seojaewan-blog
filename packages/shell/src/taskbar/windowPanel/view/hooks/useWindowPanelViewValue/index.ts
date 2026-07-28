"use client";

import { useCallback, useMemo, useState } from "react";

import type { WindowPanelViewContextValue } from "../../context";

/** Pinned/All browse 화면 상태와 명시적인 이동 action을 제공한다. */
export const useWindowPanelViewValue = (): WindowPanelViewContextValue => {
  const [view, setView] = useState<WindowPanelViewContextValue["view"]>("pinned");
  const showAll = useCallback(() => setView("all"), []);
  const showPinned = useCallback(() => setView("pinned"), []);

  return useMemo(
    () => ({
      showAll,
      showPinned,
      view,
    }),
    [showAll, showPinned, view],
  );
};
