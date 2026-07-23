"use client";

import { useCallback, useMemo, useRef } from "react";

import { usePinnedIdsState } from "../../../shared/hooks/usePinnedIdsState";
import { useWindowsEventsContext } from "../../../windowsEventsProvider";
import { useWindowsItemsContext } from "../../../windowsItemsProvider";
import { WINDOWS_PIN_STORAGE_KEY } from "../../constants";
import type { WindowsPinsContextValue, WindowsPinsMutation } from "../../types";

/** Windows pin 상태, persistence, action과 완료 event를 하나의 Context 값으로 조립한다. */
export const useWindowsPinsValue = (): WindowsPinsContextValue => {
  const windowsItems = useWindowsItemsContext();
  const { dispatch } = useWindowsEventsContext();
  const mutationRef = useRef<WindowsPinsMutation | null>(null);
  const mutationRevisionRef = useRef(0);
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
        mutationRevisionRef.current += 1;
        mutationRef.current = {
          itemId,
          ...change,
          revision: mutationRevisionRef.current,
          type: "pin",
        };
        dispatch("windowPinToStart", { itemId, ...change });
      }
    },
    [dispatch, updatePinnedIds, validItemIds],
  );

  const reorder = useCallback(
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
        const fromIndex = change.previousPinnedIds.indexOf(itemId);
        mutationRevisionRef.current += 1;
        mutationRef.current = {
          fromIndex,
          itemId,
          ...change,
          revision: mutationRevisionRef.current,
          toIndex,
          type: "reorder",
        };
        dispatch("windowsPinsReordered", {
          fromIndex,
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
        mutationRevisionRef.current += 1;
        mutationRef.current = {
          itemId,
          ...change,
          revision: mutationRevisionRef.current,
          type: "unpin",
        };
        dispatch("windowUnpinFromStart", { itemId, ...change });
      }
    },
    [dispatch, updatePinnedIds],
  );

  return useMemo(
    () => ({ isPinned, mutation: mutationRef.current, pin, pinnedIds, reorder, unpin }),
    [isPinned, pin, pinnedIds, reorder, unpin],
  );
};
