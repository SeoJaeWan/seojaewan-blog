"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useReducer,
  useRef,
} from "react";

import type { WindowItem } from "@window/ui";

import type {
  WindowMutableStateEvent,
  WindowPinStatePatch,
  WindowStateCommitProducer,
} from "../../types";
import {
  readWindowPinnedIds,
  writeWindowPinnedIds,
} from "../../utils/windowPinStorage";

interface WindowPinState {
  taskbarPinnedIds: readonly string[];
  windowsPinnedIds: readonly string[];
}

interface UseWindowPinStateOptions {
  onCommit: (event: WindowMutableStateEvent) => void;
  windowsItems: readonly WindowItem[];
}

interface UseWindowPinStateResult {
  commitState: (produceCommit: WindowStateCommitProducer) => void;
  pinState: WindowPinState;
}

const INITIAL_PIN_STATE: WindowPinState = {
  taskbarPinnedIds: [],
  windowsPinnedIds: [],
};

const arePinnedIdsEqual = (left: readonly string[], right: readonly string[]) =>
  left === right ||
  (left.length === right.length && left.every((itemId, index) => itemId === right[index]));

const windowPinStateReducer = (
  state: WindowPinState,
  patch: WindowPinStatePatch,
): WindowPinState => {
  const taskbarPinnedIds = patch.taskbarPinnedIds ?? state.taskbarPinnedIds;
  const windowsPinnedIds = patch.windowsPinnedIds ?? state.windowsPinnedIds;

  if (
    arePinnedIdsEqual(state.taskbarPinnedIds, taskbarPinnedIds) &&
    arePinnedIdsEqual(state.windowsPinnedIds, windowsPinnedIds)
  ) {
    return state;
  }

  return { taskbarPinnedIds, windowsPinnedIds };
};

const persistPinStatePatch = (patch: WindowPinStatePatch) => {
  if (patch.taskbarPinnedIds !== undefined) {
    writeWindowPinnedIds("taskbar", patch.taskbarPinnedIds);
  }

  if (patch.windowsPinnedIds !== undefined) {
    writeWindowPinnedIds("windows", patch.windowsPinnedIds);
  }
};

/**
 * Provider가 소유하는 pin state의 복원, 최신 snapshot과 완료된 commit 반영을 캡슐화한다.
 * localStorage 복원은 client effect에서 수행하며 반복 실행돼도 observer event를 만들지 않는다.
 */
export const useWindowPinState = ({
  onCommit,
  windowsItems,
}: UseWindowPinStateOptions): UseWindowPinStateResult => {
  const [pinState, updatePinState] = useReducer(windowPinStateReducer, INITIAL_PIN_STATE);
  const pinStateRef = useRef(pinState);
  const windowsItemsRef = useRef(windowsItems);

  const applyPinStatePatch = useCallback((patch: WindowPinStatePatch) => {
    pinStateRef.current = windowPinStateReducer(pinStateRef.current, patch);
    updatePinState(patch);
  }, []);

  const commitState = useCallback(
    (produceCommit: WindowStateCommitProducer) => {
      const commit = produceCommit({
        taskbarPinnedIds: pinStateRef.current.taskbarPinnedIds,
        windowsItems: windowsItemsRef.current,
        windowsPinnedIds: pinStateRef.current.windowsPinnedIds,
      });

      if (commit === null) {
        return;
      }

      persistPinStatePatch(commit.patch);

      if (commit.event !== null) {
        onCommit(commit.event);
      }

      applyPinStatePatch(commit.patch);
    },
    [applyPinStatePatch, onCommit],
  );

  useLayoutEffect(() => {
    windowsItemsRef.current = windowsItems;
  }, [windowsItems]);

  useEffect(() => {
    applyPinStatePatch({
      taskbarPinnedIds: readWindowPinnedIds("taskbar"),
      windowsPinnedIds: readWindowPinnedIds("windows"),
    });
  }, [applyPinStatePatch]);

  return { commitState, pinState };
};
