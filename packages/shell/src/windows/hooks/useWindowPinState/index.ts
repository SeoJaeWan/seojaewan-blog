"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import type { WindowItem } from "@window/ui";

import type { PinnedIdsChange, PinnedIdsUpdater, UpdatePinnedIds } from "../../types";
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

type WindowPinStateKey = keyof WindowPinState;

interface WindowPinStorage {
  read: () => readonly string[];
  write: (pinnedIds: readonly string[]) => boolean;
}

interface UseWindowPinStateOptions {
  windowsItems: readonly WindowItem[];
}

interface UseWindowPinStateResult {
  pinState: WindowPinState;
  updateTaskbarPinnedIds: UpdatePinnedIds;
  updateWindowsPinnedIds: UpdatePinnedIds;
}

const INITIAL_PIN_STATE: WindowPinState = {
  taskbarPinnedIds: [],
  windowsPinnedIds: [],
};

const PIN_STATE_KEYS = ["taskbarPinnedIds", "windowsPinnedIds"] as const;

const PIN_STORAGE = {
  taskbarPinnedIds: {
    read: readTaskbarPinnedIds,
    write: writeTaskbarPinnedIds,
  },
  windowsPinnedIds: {
    read: readWindowsPinnedIds,
    write: writeWindowsPinnedIds,
  },
} as const satisfies Record<WindowPinStateKey, WindowPinStorage>;

const createPinState = (
  getPinnedIds: (key: WindowPinStateKey) => readonly string[],
): WindowPinState =>
  PIN_STATE_KEYS.reduce<WindowPinState>(
    (state, key) => ({ ...state, [key]: getPinnedIds(key) }),
    INITIAL_PIN_STATE,
  );

const arePinnedIdsEqual = (left: readonly string[], right: readonly string[]) =>
  left === right ||
  (left.length === right.length && left.every((itemId, index) => itemId === right[index]));

const arePinStatesEqual = (left: WindowPinState, right: WindowPinState) =>
  arePinnedIdsEqual(left.taskbarPinnedIds, right.taskbarPinnedIds) &&
  arePinnedIdsEqual(left.windowsPinnedIds, right.windowsPinnedIds);

const filterPinnedIds = (pinnedIds: readonly string[], validItemIds: ReadonlySet<string>) => {
  const nextPinnedIds = pinnedIds.filter((itemId) => validItemIds.has(itemId));
  return nextPinnedIds.length === pinnedIds.length ? pinnedIds : nextPinnedIds;
};

/**
 * Provider가 소유하는 단일 pin state와 surface별 localStorage 동기화를 캡슐화한다.
 * Observer event의 의미와 전달은 action hook이 소유하며 이 hook은 변경 결과만 반환한다.
 */
export const useWindowPinState = ({
  windowsItems,
}: UseWindowPinStateOptions): UseWindowPinStateResult => {
  const [pinState, setPinState] = useState<WindowPinState>(INITIAL_PIN_STATE);
  const pinStateRef = useRef<WindowPinState>(INITIAL_PIN_STATE);
  const validItemIds = useMemo(() => new Set(windowsItems.map((item) => item.id)), [windowsItems]);
  const validItemIdsRef = useRef<ReadonlySet<string>>(validItemIds);
  validItemIdsRef.current = validItemIds;

  const applyPinState = useCallback((nextPinState: WindowPinState) => {
    if (arePinStatesEqual(pinStateRef.current, nextPinState)) {
      return;
    }

    pinStateRef.current = nextPinState;
    setPinState(nextPinState);
  }, []);

  const applyPinnedIds = useCallback(
    (key: WindowPinStateKey, requestedPinnedIds: readonly string[]): PinnedIdsChange | null => {
      const previousPinnedIds = pinStateRef.current[key];
      const pinnedIds = filterPinnedIds(requestedPinnedIds, validItemIdsRef.current);

      if (arePinnedIdsEqual(previousPinnedIds, pinnedIds)) {
        return null;
      }

      applyPinState({ ...pinStateRef.current, [key]: pinnedIds });
      PIN_STORAGE[key].write(pinnedIds);

      return { pinnedIds, previousPinnedIds };
    },
    [applyPinState],
  );

  const updatePinnedIds = useCallback(
    (key: WindowPinStateKey, update: PinnedIdsUpdater): PinnedIdsChange | null => {
      const currentPinnedIds = filterPinnedIds(pinStateRef.current[key], validItemIdsRef.current);

      if (!arePinnedIdsEqual(pinStateRef.current[key], currentPinnedIds)) {
        applyPinnedIds(key, currentPinnedIds);
      }

      const nextPinnedIds = update(currentPinnedIds);
      return nextPinnedIds === null ? null : applyPinnedIds(key, nextPinnedIds);
    },
    [applyPinnedIds],
  );

  const updateTaskbarPinnedIds = useCallback<UpdatePinnedIds>(
    (update) => updatePinnedIds("taskbarPinnedIds", update),
    [updatePinnedIds],
  );

  const updateWindowsPinnedIds = useCallback<UpdatePinnedIds>(
    (update) => updatePinnedIds("windowsPinnedIds", update),
    [updatePinnedIds],
  );

  useEffect(() => {
    const storedPinState = createPinState((key) => PIN_STORAGE[key].read());
    const nextPinState = createPinState((key) =>
      filterPinnedIds(storedPinState[key], validItemIdsRef.current),
    );

    applyPinState(nextPinState);

    for (const key of PIN_STATE_KEYS) {
      if (!arePinnedIdsEqual(storedPinState[key], nextPinState[key])) {
        PIN_STORAGE[key].write(nextPinState[key]);
      }
    }
  }, [applyPinState]);

  useEffect(() => {
    for (const key of PIN_STATE_KEYS) {
      const pinnedIds = filterPinnedIds(pinStateRef.current[key], validItemIds);
      applyPinnedIds(key, pinnedIds);
    }
  }, [applyPinnedIds, validItemIds]);

  const normalizedPinState = useMemo<WindowPinState>(
    () => ({
      taskbarPinnedIds: filterPinnedIds(pinState.taskbarPinnedIds, validItemIds),
      windowsPinnedIds: filterPinnedIds(pinState.windowsPinnedIds, validItemIds),
    }),
    [pinState, validItemIds],
  );

  return {
    pinState: normalizedPinState,
    updateTaskbarPinnedIds,
    updateWindowsPinnedIds,
  };
};
