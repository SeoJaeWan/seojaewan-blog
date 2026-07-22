"use client";

export type { TaskbarPanelHostProps } from "./taskbar/panelHost";
export { TaskbarPanelHost } from "./taskbar/panelHost";
export type { TaskbarStartButtonProps } from "./taskbar/startButton";
export { TaskbarStartButton } from "./taskbar/startButton";
export type { WindowsProps } from "./windows";
export { Windows } from "./windows";
export { useWindowSearch } from "./windows/hooks/useWindowSearch";
export { useWindowDispatch, useWindowEvent } from "./windows/providers/windowsEventsProvider";
export type {
  WindowContextMenuEvent,
  WindowDispatch,
  WindowDispatchEventMap,
  WindowEventListener,
  WindowEventMap,
  WindowEventName,
  WindowItemEvent,
  WindowPinEvent,
  WindowPinsReorderedEvent,
  WindowsItemsUpdatedEvent,
  WindowsState,
  WindowStateEventMap,
} from "./windows/types";
