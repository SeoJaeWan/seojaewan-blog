"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import type { WindowItem } from "@window/ui";

import type { UpdatePinnedIds, WindowMutableStateEvent } from "../../types";
import {
  readTaskbarPinnedIds,
  readWindowsPinnedIds,
  writeTaskbarPinnedIds,
  writeWindowsPinnedIds,
} from "../../utils/windowPinStorage";

interface WindowPinState {
  taskbarPinnedIds: readonly string[];
  windowsPinnedIds: readonly string[];
}

interface UseWindowPinStateOptions {
  onStateEvent: (event: WindowMutableStateEvent) => void;
  windowsItems: readonly WindowItem[];
}

interface UseWindowPinStateResult {
  pinState: WindowPinState;
  updateTaskbarPinnedIds: UpdatePinnedIds;
  updateWindowsPinnedIds: UpdatePinnedIds;
}

const arePinnedIdsEqual = (left: readonly string[], right: readonly string[]) =>
  left === right ||
  (left.length === right.length && left.every((itemId, index) => itemId === right[index]));

const filterPinnedIds = (pinnedIds: readonly string[], validItemIds: ReadonlySet<string>) => {
  const nextPinnedIds = pinnedIds.filter((itemId) => validItemIds.has(itemId));
  return nextPinnedIds.length === pinnedIds.length ? pinnedIds : nextPinnedIds;
};

/**
 * Provider가 소유하는 Taskbar/Windows pin state의 복원, 저장과 완료 update를 캡슐화한다.
 * windowsItems를 canonical item source로 사용하고 사라진 ID는 event 없이 즉시 정리한다.
 */
export const useWindowPinState = ({
  onStateEvent,
  windowsItems,
}: UseWindowPinStateOptions): UseWindowPinStateResult => {
  const [taskbarPinnedIds, setTaskbarPinnedIds] = useState<readonly string[]>([]);
  const [windowsPinnedIds, setWindowsPinnedIds] = useState<readonly string[]>([]);
  const pinStateRef = useRef<WindowPinState>({
    taskbarPinnedIds: [],
    windowsPinnedIds: [],
  });
  const validItemIds = useMemo(() => new Set(windowsItems.map((item) => item.id)), [windowsItems]);
  const validItemIdsRef = useRef<ReadonlySet<string>>(validItemIds);
  validItemIdsRef.current = validItemIds;

  const applyTaskbarPinnedIds = useCallback((pinnedIds: readonly string[]) => {
    const currentState = pinStateRef.current;

    if (arePinnedIdsEqual(currentState.taskbarPinnedIds, pinnedIds)) {
      return false;
    }

    pinStateRef.current = { ...currentState, taskbarPinnedIds: pinnedIds };
    setTaskbarPinnedIds(pinnedIds);
    return true;
  }, []);

  const applyWindowsPinnedIds = useCallback((pinnedIds: readonly string[]) => {
    const currentState = pinStateRef.current;

    if (arePinnedIdsEqual(currentState.windowsPinnedIds, pinnedIds)) {
      return false;
    }

    pinStateRef.current = { ...currentState, windowsPinnedIds: pinnedIds };
    setWindowsPinnedIds(pinnedIds);
    return true;
  }, []);

  const updateTaskbarPinnedIds = useCallback<UpdatePinnedIds>(
    (update) => {
      const storedPinnedIds = pinStateRef.current.taskbarPinnedIds;
      const currentPinnedIds = filterPinnedIds(storedPinnedIds, validItemIdsRef.current);
      const result = update(currentPinnedIds);

      if (result === null) {
        if (currentPinnedIds !== storedPinnedIds && applyTaskbarPinnedIds(currentPinnedIds)) {
          writeTaskbarPinnedIds(currentPinnedIds);
        }
        return;
      }

      const nextPinnedIds = filterPinnedIds(result.pinnedIds, validItemIdsRef.current);

      if (!applyTaskbarPinnedIds(nextPinnedIds)) {
        return;
      }

      writeTaskbarPinnedIds(nextPinnedIds);

      if (result.event !== null) {
        onStateEvent(result.event);
      }
    },
    [applyTaskbarPinnedIds, onStateEvent],
  );

  const updateWindowsPinnedIds = useCallback<UpdatePinnedIds>(
    (update) => {
      const storedPinnedIds = pinStateRef.current.windowsPinnedIds;
      const currentPinnedIds = filterPinnedIds(storedPinnedIds, validItemIdsRef.current);
      const result = update(currentPinnedIds);

      if (result === null) {
        if (currentPinnedIds !== storedPinnedIds && applyWindowsPinnedIds(currentPinnedIds)) {
          writeWindowsPinnedIds(currentPinnedIds);
        }
        return;
      }

      const nextPinnedIds = filterPinnedIds(result.pinnedIds, validItemIdsRef.current);

      if (!applyWindowsPinnedIds(nextPinnedIds)) {
        return;
      }

      writeWindowsPinnedIds(nextPinnedIds);

      if (result.event !== null) {
        onStateEvent(result.event);
      }
    },
    [applyWindowsPinnedIds, onStateEvent],
  );

  useEffect(() => {
    const storedTaskbarPinnedIds = readTaskbarPinnedIds();
    const storedWindowsPinnedIds = readWindowsPinnedIds();
    const nextTaskbarPinnedIds = filterPinnedIds(storedTaskbarPinnedIds, validItemIdsRef.current);
    const nextWindowsPinnedIds = filterPinnedIds(storedWindowsPinnedIds, validItemIdsRef.current);

    applyTaskbarPinnedIds(nextTaskbarPinnedIds);
    applyWindowsPinnedIds(nextWindowsPinnedIds);

    if (!arePinnedIdsEqual(storedTaskbarPinnedIds, nextTaskbarPinnedIds)) {
      writeTaskbarPinnedIds(nextTaskbarPinnedIds);
    }
    if (!arePinnedIdsEqual(storedWindowsPinnedIds, nextWindowsPinnedIds)) {
      writeWindowsPinnedIds(nextWindowsPinnedIds);
    }
  }, [applyTaskbarPinnedIds, applyWindowsPinnedIds]);

  useEffect(() => {
    updateTaskbarPinnedIds((currentPinnedIds) => {
      const pinnedIds = filterPinnedIds(currentPinnedIds, validItemIds);
      return pinnedIds === currentPinnedIds ? null : { event: null, pinnedIds };
    });
    updateWindowsPinnedIds((currentPinnedIds) => {
      const pinnedIds = filterPinnedIds(currentPinnedIds, validItemIds);
      return pinnedIds === currentPinnedIds ? null : { event: null, pinnedIds };
    });
  }, [updateTaskbarPinnedIds, updateWindowsPinnedIds, validItemIds]);

  const pinState = useMemo<WindowPinState>(
    () => ({
      taskbarPinnedIds: filterPinnedIds(taskbarPinnedIds, validItemIds),
      windowsPinnedIds: filterPinnedIds(windowsPinnedIds, validItemIds),
    }),
    [taskbarPinnedIds, validItemIds, windowsPinnedIds],
  );

  return { pinState, updateTaskbarPinnedIds, updateWindowsPinnedIds };
};
