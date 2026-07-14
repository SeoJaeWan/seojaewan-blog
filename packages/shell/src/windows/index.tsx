"use client";

import type { ReactNode } from "react";
import { createContext, useCallback, useEffect, useMemo, useReducer, useRef, useState } from "react";

import type { WindowItem } from "@window/ui";

import type {
  WindowDispatch,
  WindowMutableStateEvent,
  WindowsState,
} from "./types";
import {
  createWindowEventRegistry,
  type WindowEventRegistry,
} from "./utils/createWindowEventRegistry";

interface MutableWindowsState {
  taskbarPinnedIds: readonly string[];
  windowsPinnedIds: readonly string[];
}

interface MutableWindowsStatePatch {
  taskbarPinnedIds?: readonly string[];
  windowsPinnedIds?: readonly string[];
}

export interface WindowStateCommit {
  event: WindowMutableStateEvent;
  patch: MutableWindowsStatePatch;
}

export interface WindowsControllerContextValue {
  commitState: (commit: WindowStateCommit) => void;
  dispatch: WindowDispatch;
  subscribe: WindowEventRegistry["subscribe"];
}

const INITIAL_MUTABLE_STATE: MutableWindowsState = {
  taskbarPinnedIds: [],
  windowsPinnedIds: [],
};

const mutableWindowsStateReducer = (
  state: MutableWindowsState,
  patch: MutableWindowsStatePatch,
): MutableWindowsState => ({
  taskbarPinnedIds: patch.taskbarPinnedIds ?? state.taskbarPinnedIds,
  windowsPinnedIds: patch.windowsPinnedIds ?? state.windowsPinnedIds,
});

/** Windows 상태를 읽는 shell domain hook이 사용할 context. */
export const WindowsStateContext = createContext<WindowsState | null>(null);

/** Windows event hook과 후속 pin hook이 사용할 안정적인 controller context. */
export const WindowsControllerContext = createContext<WindowsControllerContextValue | null>(null);

export interface WindowsProps {
  children: ReactNode;
  /** 앱이 소유하는 전체 WindowItem. 배열 참조가 변경될 때 갱신된다. */
  windowsItems: readonly WindowItem[];
}

/**
 * 앱 root에서 전체 WindowItem, surface별 pin ID와 observer registry를 제공한다.
 * windowsItems는 props만 source of truth로 사용하고 mutable pin state 변경은 완료된 commit만 받는다.
 *
 * @param props.children Windows domain을 사용할 shell과 앱 컴포넌트
 * @param props.windowsItems 앱이 소유하는 전체 WindowItem
 */
export const Windows = ({ children, windowsItems }: WindowsProps) => {
  const [eventRegistry] = useState(createWindowEventRegistry);
  const [mutableState, updateMutableState] = useReducer(
    mutableWindowsStateReducer,
    INITIAL_MUTABLE_STATE,
  );
  const previousWindowsItemsRef = useRef(windowsItems);
  const pendingStateEventsRef = useRef<WindowMutableStateEvent[]>([]);

  const commitState = useCallback((commit: WindowStateCommit) => {
    pendingStateEventsRef.current.push(commit.event);
    updateMutableState(commit.patch);
  }, []);

  const dispatch = useCallback<WindowDispatch>(
    (eventName, payload) => {
      eventRegistry.emit(eventName, payload);
    },
    [eventRegistry],
  );

  useEffect(() => {
    const previousItems = previousWindowsItemsRef.current;

    if (Object.is(previousItems, windowsItems)) {
      return;
    }

    previousWindowsItemsRef.current = windowsItems;
    eventRegistry.emit("windowsItemsUpdated", {
      items: windowsItems,
      previousItems,
    });
  }, [eventRegistry, windowsItems]);

  useEffect(() => {
    const pendingStateEvents = pendingStateEventsRef.current;

    if (pendingStateEvents.length === 0) {
      return;
    }

    pendingStateEventsRef.current = [];

    for (const event of pendingStateEvents) {
      eventRegistry.emit(event.name, event.payload);
    }
  }, [eventRegistry, mutableState]);

  const stateValue = useMemo<WindowsState>(
    () => ({
      taskbarPinnedIds: mutableState.taskbarPinnedIds,
      windowsItems,
      windowsPinnedIds: mutableState.windowsPinnedIds,
    }),
    [mutableState, windowsItems],
  );

  const controllerValue = useMemo<WindowsControllerContextValue>(
    () => ({
      commitState,
      dispatch,
      subscribe: eventRegistry.subscribe,
    }),
    [commitState, dispatch, eventRegistry],
  );

  return (
    <WindowsControllerContext.Provider value={controllerValue}>
      <WindowsStateContext.Provider value={stateValue}>{children}</WindowsStateContext.Provider>
    </WindowsControllerContext.Provider>
  );
};
