"use client";

import { useEffect, useId, useRef, useState } from "react";

import { clsx } from "clsx";

import { PopoverUI } from "../../primitives";
import { TaskbarPanelContainerUI } from "./taskbarPanelContainerUI";
import type { TaskbarPanelUIOpenChangeDetails, TaskbarPanelUIProps } from "./taskbarUI.types";
import { useTaskbarWidgetContext } from "./taskbarWidgetContext";

import "./taskbarUI.css";

/**
 * Taskbar control과 floating panel을 production Popover lifecycle로 연결한다.
 *
 * portal, placement, focus, dismiss와 single-active 상태는 private Taskbar scope 안에서 끝난다.
 */
export const TaskbarPanelUI = ({
  align = "center",
  children,
  className,
  defaultOpen = false,
  label,
  motion = "full",
  onOpenChange,
  onOpenChangeComplete,
  open,
  side = "top",
  sideOffset = 8,
  trigger,
  ...props
}: TaskbarPanelUIProps) => {
  const widgetId = useId();
  const scope = useTaskbarWidgetContext();
  const activateWidget = scope?.activateWidget;
  const deactivateWidget = scope?.deactivateWidget;
  const registerWidget = scope?.registerWidget;
  const controlled = open !== undefined;
  const [uncontrolledOpen, setUncontrolledOpen] = useState(defaultOpen);
  const requestedOpen = controlled ? open : uncontrolledOpen;
  const previousRequestedOpenRef = useRef(false);
  const controlledRef = useRef(controlled);
  const onOpenChangeRef = useRef(onOpenChange);

  controlledRef.current = controlled;
  onOpenChangeRef.current = onOpenChange;

  useEffect(() => {
    if (!registerWidget) return;

    return registerWidget(widgetId, (reason) => {
      if (!controlledRef.current) setUncontrolledOpen(false);
      onOpenChangeRef.current?.(false, { reason });
    });
  }, [registerWidget, widgetId]);

  useEffect(() => {
    if (!activateWidget || !deactivateWidget) return;

    const wasRequestedOpen = previousRequestedOpenRef.current;
    if (requestedOpen && !wasRequestedOpen) activateWidget(widgetId);
    if (!requestedOpen && wasRequestedOpen) deactivateWidget(widgetId);
    previousRequestedOpenRef.current = requestedOpen;
  }, [activateWidget, deactivateWidget, requestedOpen, widgetId]);

  const effectiveOpen =
    requestedOpen &&
    (scope === null || (scope.layerElement !== null && scope.activeWidgetId === widgetId));

  const handleOpenChange = (nextOpen: boolean, details: TaskbarPanelUIOpenChangeDetails) => {
    if (!controlled) setUncontrolledOpen(nextOpen);
    if (nextOpen) activateWidget?.(widgetId);
    else if (!controlled) deactivateWidget?.(widgetId);
    onOpenChange?.(nextOpen, details);
  };

  return (
    <PopoverUI
      onOpenChange={handleOpenChange}
      onOpenChangeComplete={onOpenChangeComplete}
      open={effectiveOpen}
    >
      <PopoverUI.Trigger render={trigger} />
      <PopoverUI.Content
        {...props}
        align={align}
        className={clsx("wd-taskbar-panel-ui", className)}
        container={scope?.layerElement}
        side={side}
        sideOffset={sideOffset}
      >
        <PopoverUI.Title className="wd-taskbar-panel-ui__title">{label}</PopoverUI.Title>
        <TaskbarPanelContainerUI motion={motion}>{children}</TaskbarPanelContainerUI>
      </PopoverUI.Content>
    </PopoverUI>
  );
};
