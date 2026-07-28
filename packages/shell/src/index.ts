"use client";

export type {
  ContextMenuActionEntry,
  ContextMenuCloseReason,
  ContextMenuEntry,
  ContextMenuProviderProps,
  ContextMenuSeparatorEntry,
  ContextMenuSubmenuEntry,
  ContextMenuTriggerHandler,
  UseContextMenuTriggerOptions,
} from "./contextMenu";
export { ContextMenuProvider, useContextMenuTrigger } from "./contextMenu";
export type {
  TaskbarPanelContentProps,
  TaskbarPanelPlacement,
  TaskbarPanelProps,
  TaskbarPanelRootProps,
  TaskbarPanelTriggerProps,
} from "./taskbar/panel";
export { TaskbarPanel } from "./taskbar/panel";
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
  WindowsPanelItemSource,
  WindowsState,
  WindowStateEventMap,
} from "./windows/types";
