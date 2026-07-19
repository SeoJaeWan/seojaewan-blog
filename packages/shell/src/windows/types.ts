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

/** Provider state update 뒤에만 발생할 수 있는 event map. */
export interface WindowStateEventMap {
  windowPinToStart: WindowPinEvent;
  windowPinToTaskbar: WindowPinEvent;
  windowsItemsUpdated: WindowsItemsUpdatedEvent;
  windowsPinsReordered: WindowPinsReorderedEvent;
  windowUnpinFromStart: WindowPinEvent;
  windowUnpinFromTaskbar: WindowPinEvent;
}

/** Provider state 변경 없이 직접 발생할 수 있는 event map. */
export interface WindowDispatchEventMap {
  windowContextMenuRequested: WindowContextMenuEvent;
  windowOpen: WindowItemEvent;
  windowOpenLocation: WindowItemEvent;
}

/** useWindowEvent가 구독할 수 있는 전체 event map. */
export interface WindowEventMap extends WindowDispatchEventMap, WindowStateEventMap {}

export type WindowEventName = keyof WindowEventMap;

/** 특정 event name에 대응하는 observer callback. */
export type WindowEventListener<Name extends WindowEventName> = (
  payload: WindowEventMap[Name],
) => void;

/** 상태 없는 event만 허용하는 public dispatch 계약. */
export type WindowDispatch = <Name extends keyof WindowDispatchEventMap>(
  eventName: Name,
  payload: WindowDispatchEventMap[Name],
) => void;

/** 완료된 pin state update와 함께 전달할 event. */
export type WindowMutableStateEvent = {
  [Name in Exclude<keyof WindowStateEventMap, "windowsItemsUpdated">]: {
    name: Name;
    payload: WindowStateEventMap[Name];
  };
}[Exclude<keyof WindowStateEventMap, "windowsItemsUpdated">];

/** 실제로 반영된 pin ID 변경 결과. */
export interface PinnedIdsChange {
  pinnedIds: readonly string[];
  previousPinnedIds: readonly string[];
}

/** 최신 ID에서 다음 pin ID를 계산하는 내부 updater. */
export type PinnedIdsUpdater = (currentPinnedIds: readonly string[]) => readonly string[] | null;

/** Pin ID 변경을 시도하고 실제 반영 결과를 동기적으로 반환하는 내부 계약. */
export type UpdatePinnedIds = (update: PinnedIdsUpdater) => PinnedIdsChange | null;
