"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

import { clsx } from "clsx";

import { TaskbarPanelLayerUI } from "./taskbarPanelLayerUI";
import type { TaskbarRootUIProps } from "./taskbarUI.types";
import { TaskbarWidgetProvider } from "./taskbarWidgetContext";

import "./taskbarUI.css";

/**
 * viewport 하단 50px glass surface와 한 개의 private floating panel scope를 제공한다.
 */
export const TaskbarRootUI = ({ className, portalContainer, ...props }: TaskbarRootUIProps) => {
  const [hydrated, setHydrated] = useState(false);
  const [layerElement, setLayerElement] = useState<HTMLDivElement | null>(null);

  useEffect(() => {
    setHydrated(true);
  }, []);

  const resolvedPortalContainer =
    portalContainer === undefined ? (hydrated ? document.body : null) : portalContainer;

  return (
    <TaskbarWidgetProvider layerElement={layerElement}>
      <nav {...props} className={clsx("wd-taskbar-root-ui", className)} />
      {resolvedPortalContainer
        ? createPortal(<TaskbarPanelLayerUI ref={setLayerElement} />, resolvedPortalContainer)
        : null}
    </TaskbarWidgetProvider>
  );
};
