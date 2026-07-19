import type { WindowItem, WindowsPanelItemSource } from "@window/ui";

/** Windows가 공유하는 전체 item과 surface별 pin ID 상태. */
export interface WindowsState {
  taskbarPinnedIds: readonly string[];
  windowsItems: readonly WindowItem[];
  windowsPinnedIds: readonly string[];
}

/** windowsItems prop의 참조가 변경되어 반영된 뒤 전달할 payload. */
export interface WindowsItemsUpdatedEvent {
  items: readonly WindowItem[];
  previousItems: readonly WindowItem[];
}

/** pin 추가 또는 제거가 완료된 뒤 전달할 payload. */
export interface WindowPinEvent {
  itemId: string;
  pinnedIds: readonly string[];
  previousPinnedIds: readonly string[];
}

/** pin reorder가 완료된 뒤 전달할 payload. */
export interface WindowPinsReorderedEvent {
  fromIndex: number;
  movedItemId: string;
  pinnedIds: readonly string[];
  previousPinnedIds: readonly string[];
  toIndex: number;
}

/** 상태 변경 없이 WindowItem action을 요청할 때 전달할 payload. */
export interface WindowItemEvent {
  item: WindowItem;
  source: WindowsPanelItemSource;
}

/** context menu 요청을 observer에 전달할 payload. */
export interface WindowContextMenuEvent {
  item: WindowItem;
  source: WindowsPanelItemSource;
}

/** useWindowEvent가 구독할 수 있는 전체 event map. */
export interface WindowEventMap {
  windowContextMenuRequested: WindowContextMenuEvent;
  windowOpen: WindowItemEvent;
  windowOpenLocation: WindowItemEvent;
  windowPinToStart: WindowPinEvent;
  windowPinToTaskbar: WindowPinEvent;
  windowsItemsUpdated: WindowsItemsUpdatedEvent;
  windowsPinsReordered: WindowPinsReorderedEvent;
  windowUnpinFromStart: WindowPinEvent;
  windowUnpinFromTaskbar: WindowPinEvent;
}

export type WindowEventName = keyof WindowEventMap;

/** Public dispatch가 직접 발생시킬 수 있는 상태 없는 event name. */
export type WindowDispatchEventName =
  "windowContextMenuRequested" | "windowOpen" | "windowOpenLocation";

/** 이전 public event map 계약을 단일 WindowEventMap에서 파생한다. */
export type WindowDispatchEventMap = Pick<WindowEventMap, WindowDispatchEventName>;

/** Provider가 상태 반영 후 발생시키는 event map을 단일 WindowEventMap에서 파생한다. */
export type WindowStateEventMap = Omit<WindowEventMap, WindowDispatchEventName>;

/** 특정 event name에 대응하는 observer callback. */
export type WindowEventListener<Name extends WindowEventName> = (
  payload: WindowEventMap[Name],
) => void;

/** 상태 없는 event만 허용하는 public dispatch 계약. */
export type WindowDispatch = <Name extends WindowDispatchEventName>(
  eventName: Name,
  payload: WindowEventMap[Name],
) => void;
