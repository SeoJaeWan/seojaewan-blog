"use client";

import { useCallback, useMemo } from "react";

import { usePinnedIdsState } from "../../../shared/hooks/usePinnedIdsState";
import { useWindowsEventsContext } from "../../../windowsEventsProvider/hooks/useWindowsEventsContext";
import { useWindowsItemsContext } from "../../../windowsItemsProvider/hooks/useWindowsItemsContext";
import { WINDOWS_PIN_STORAGE_KEY } from "../../constants";
import type { UseWindowsPins } from "../../types";

/** Windows pin 상태, persistence, action과 완료 event를 하나의 Context 값으로 조립한다. */
export const useWindowsPinsValue = (): UseWindowsPins => {
  const windowsItems = useWindowsItemsContext();
  const { dispatch } = useWindowsEventsContext();
  const validItemIds = useMemo(() => new Set(windowsItems.map((item) => item.id)), [windowsItems]);
  const { pinnedIds, updatePinnedIds } = usePinnedIdsState({
    storageKey: WINDOWS_PIN_STORAGE_KEY,
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
        dispatch("windowPinToStart", { itemId, ...change });
      }
    },
    [dispatch, updatePinnedIds, validItemIds],
  );

  const applyReorder = useCallback(
    (itemId: string, toIndex: number) => {
      const change = updatePinnedIds((currentPinnedIds) => {
        const fromIndex = currentPinnedIds.indexOf(itemId);

        if (
          fromIndex === -1 ||
          !Number.isInteger(toIndex) ||
          toIndex < 0 ||
          toIndex >= currentPinnedIds.length ||
          fromIndex === toIndex
        ) {
          return null;
        }

        const nextPinnedIds = [...currentPinnedIds];
        nextPinnedIds.splice(fromIndex, 1);
        nextPinnedIds.splice(toIndex, 0, itemId);

        return nextPinnedIds;
      });

      if (change !== null) {
        dispatch("windowsPinsReordered", {
          fromIndex: change.previousPinnedIds.indexOf(itemId),
          movedItemId: itemId,
          pinnedIds: change.pinnedIds,
          previousPinnedIds: change.previousPinnedIds,
          toIndex,
        });
      }
    },
    [dispatch, updatePinnedIds],
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
        dispatch("windowUnpinFromStart", { itemId, ...change });
      }
    },
    [dispatch, updatePinnedIds],
  );

  return useMemo(
    () => ({ applyReorder, isPinned, pin, pinnedIds, unpin }),
    [applyReorder, isPinned, pin, pinnedIds, unpin],
  );
};
