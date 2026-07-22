"use client";

import { useCallback, useMemo } from "react";

import { usePinnedIdsState } from "../../../shared/hooks/usePinnedIdsState";
import { useWindowsEventsContext } from "../../../windowsEventsProvider";
import { useWindowsItemsContext } from "../../../windowsItemsProvider/hooks/useWindowsItemsContext";
import { TASKBAR_PIN_STORAGE_KEY } from "../../constants";
import type { UseTaskbarPins } from "../../types";

/** Taskbar pin 상태, persistence, action과 완료 event를 하나의 Context 값으로 조립한다. */
export const useTaskbarPinsValue = (): UseTaskbarPins => {
  const windowsItems = useWindowsItemsContext();
  const { dispatch } = useWindowsEventsContext();
  const validItemIds = useMemo(() => new Set(windowsItems.map((item) => item.id)), [windowsItems]);
  const { pinnedIds, updatePinnedIds } = usePinnedIdsState({
    storageKey: TASKBAR_PIN_STORAGE_KEY,
    validItemIds,
  });

  const isPinned = useCallback((itemId: string) => pinnedIds.includes(itemId), [pinnedIds]);

  const pin = useCallback(
    (itemId: string) => {
      const change = updatePinnedIds((currentPinnedIds) => {
        if (currentPinnedIds.includes(itemId) || !validItemIds.has(itemId)) {
          return null;
        }

        return [...currentPinnedIds, itemId];
      });

      if (change !== null) {
        dispatch("windowPinToTaskbar", { itemId, ...change });
      }
    },
    [dispatch, updatePinnedIds, validItemIds],
  );

  const unpin = useCallback(
    (itemId: string) => {
      const change = updatePinnedIds((currentPinnedIds) => {
        if (!currentPinnedIds.includes(itemId)) {
          return null;
        }

        return currentPinnedIds.filter((pinnedId) => pinnedId !== itemId);
      });

      if (change !== null) {
        dispatch("windowUnpinFromTaskbar", { itemId, ...change });
      }
    },
    [dispatch, updatePinnedIds],
  );

  return useMemo(() => ({ isPinned, pin, pinnedIds, unpin }), [isPinned, pin, pinnedIds, unpin]);
};
