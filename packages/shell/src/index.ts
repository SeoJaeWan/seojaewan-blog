"use client";

export type { TaskbarPanelHostProps } from "./taskbar/panelHost";
export { TaskbarPanelHost } from "./taskbar/panelHost";
export type { TaskbarStartButtonProps } from "./taskbar/startButton";
export { TaskbarStartButton } from "./taskbar/startButton";
export type { WindowsProps } from "./windows";
export { Windows } from "./windows";
export { useWindowDispatch } from "./windows/hooks/useWindowDispatch";
export { useWindowEvent } from "./windows/hooks/useWindowEvent";
export type { UseWindowPinAnimation } from "./windows/hooks/useWindowPinAnimation";
export { useWindowPinAnimation } from "./windows/hooks/useWindowPinAnimation";
export type { UseWindowPins } from "./windows/hooks/useWindowPins";
export { useWindowPins } from "./windows/hooks/useWindowPins";
export { useWindowSearch } from "./windows/hooks/useWindowSearch";
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
  WindowPinTarget,
  WindowsItemsUpdatedEvent,
  WindowsState,
  WindowStateEventMap,
} from "./windows/types";
