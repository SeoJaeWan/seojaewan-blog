"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import type { UpdatePinnedIds, WindowMutableStateEvent, WindowPinTarget } from "../../types";
import { readWindowPinnedIds, writeWindowPinnedIds } from "../../utils/windowPinStorage";

interface WindowPinState {
  taskbarPinnedIds: readonly string[];
  windowsPinnedIds: readonly string[];
}

interface UseWindowPinStateOptions {
  onStateEvent: (event: WindowMutableStateEvent) => void;
}

interface UseWindowPinStateResult {
  pinState: WindowPinState;
  updatePinnedIds: UpdatePinnedIds;
}

const arePinnedIdsEqual = (left: readonly string[], right: readonly string[]) =>
  left === right ||
  (left.length === right.length && left.every((itemId, index) => itemId === right[index]));

const getPinnedIds = (state: WindowPinState, target: WindowPinTarget) =>
  target === "windows" ? state.windowsPinnedIds : state.taskbarPinnedIds;

/**
 * Provider가 소유하는 target별 pin state의 복원, 저장과 완료 update 반영을 캡슐화한다.
 * localStorage 복원은 client effect에서 수행하며 반복 실행돼도 observer event를 만들지 않는다.
 */
export const useWindowPinState = ({
  onStateEvent,
}: UseWindowPinStateOptions): UseWindowPinStateResult => {
  const [taskbarPinnedIds, setTaskbarPinnedIds] = useState<readonly string[]>([]);
  const [windowsPinnedIds, setWindowsPinnedIds] = useState<readonly string[]>([]);
  const pinStateRef = useRef<WindowPinState>({
    taskbarPinnedIds: [],
    windowsPinnedIds: [],
  });

  const applyPinnedIds = useCallback((target: WindowPinTarget, pinnedIds: readonly string[]) => {
    const currentState = pinStateRef.current;

    if (arePinnedIdsEqual(getPinnedIds(currentState, target), pinnedIds)) {
      return false;
    }

    pinStateRef.current =
      target === "windows"
        ? { ...currentState, windowsPinnedIds: pinnedIds }
        : { ...currentState, taskbarPinnedIds: pinnedIds };

    if (target === "windows") {
      setWindowsPinnedIds(pinnedIds);
    } else {
      setTaskbarPinnedIds(pinnedIds);
    }

    return true;
  }, []);

  const updatePinnedIds = useCallback<UpdatePinnedIds>(
    (target, update) => {
      const currentPinnedIds = getPinnedIds(pinStateRef.current, target);
      const result = update(currentPinnedIds);

      if (result === null || !applyPinnedIds(target, result.pinnedIds)) {
        return;
      }

      writeWindowPinnedIds(target, result.pinnedIds);

      if (result.event !== null) {
        onStateEvent(result.event);
      }
    },
    [applyPinnedIds, onStateEvent],
  );

  useEffect(() => {
    applyPinnedIds("taskbar", readWindowPinnedIds("taskbar"));
    applyPinnedIds("windows", readWindowPinnedIds("windows"));
  }, [applyPinnedIds]);

  const pinState = useMemo<WindowPinState>(
    () => ({ taskbarPinnedIds, windowsPinnedIds }),
    [taskbarPinnedIds, windowsPinnedIds],
  );

  return { pinState, updatePinnedIds };
};
