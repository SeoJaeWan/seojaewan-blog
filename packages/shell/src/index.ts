"use client";

export type { TaskbarPanelHostProps } from "./taskbar/panelHost";
export { TaskbarPanelHost } from "./taskbar/panelHost";
export type {
  TaskbarStartButtonItemInteractions,
  TaskbarStartButtonProps,
} from "./taskbar/startButton";
export { TaskbarStartButton } from "./taskbar/startButton";
export type { WindowsProps } from "./windows";
export { Windows } from "./windows";
export { useWindowDispatch } from "./windows/hooks/useWindowDispatch";
export { useWindowEvent } from "./windows/hooks/useWindowEvent";
export type { UseWindowPinnedItemsResult } from "./windows/hooks/useWindowPinnedItems";
export { useWindowPinnedItems } from "./windows/hooks/useWindowPinnedItems";
export type { UseWindowPinsResult } from "./windows/hooks/useWindowPins";
export { useWindowPins } from "./windows/hooks/useWindowPins";
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
