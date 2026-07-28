"use client";

import { useContext } from "react";

import { WindowPanelViewContext } from "../../context";

/** WindowPanelView.Root가 제공하는 browse navigation을 읽는다. */
export const useWindowPanelViewContext = () => {
  const context = useContext(WindowPanelViewContext);

  if (context === null) {
    throw new Error("Window panel view는 WindowPanelView.Root 안에서 사용해야 합니다.");
  }

  return context;
};
