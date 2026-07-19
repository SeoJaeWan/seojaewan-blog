"use client";

import { useCallback, useContext, useMemo } from "react";

import { WindowsControllerContext, WindowsStateContext } from "../..";

export interface UseWindowsPins {
  /** Animation 완료 뒤 Windows panel의 실제 순서를 반영한다. */
  applyReorder: (itemId: string, toIndex: number) => void;
  isPinned: (itemId: string) => boolean;
  pin: (itemId: string) => void;
  pinnedIds: readonly string[];
  unpin: (itemId: string) => void;
}

/** Windows panel pin ID와 add/remove 및 완료된 reorder update를 제공한다. */
export const useWindowsPins = (): UseWindowsPins => {
  const state = useContext(WindowsStateContext);
  const controller = useContext(WindowsControllerContext);

  if (state === null || controller === null) {
    throw new Error("useWindowsPins는 Windows 안에서 사용해야 합니다.");
  }

  const pinnedIds = state.windowsPinnedIds;
  const isPinned = useCallback((itemId: string) => pinnedIds.includes(itemId), [pinnedIds]);

  const pin = useCallback(
    (itemId: string) => {
      const change = controller.updateWindowsPinnedIds((currentPinnedIds) => {
        if (
          currentPinnedIds.includes(itemId) ||
          !state.windowsItems.some((item) => item.id === itemId)
        ) {
          return null;
        }

        return [...currentPinnedIds, itemId];
      });

      if (change !== null) {
        controller.emitStateEvent({
          name: "windowPinToStart",
          payload: { itemId, ...change },
        });
      }
    },
    [controller, state.windowsItems],
  );

  const applyReorder = useCallback(
    (itemId: string, toIndex: number) => {
      const change = controller.updateWindowsPinnedIds((currentPinnedIds) => {
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
        controller.emitStateEvent({
          name: "windowsPinsReordered",
          payload: {
            fromIndex: change.previousPinnedIds.indexOf(itemId),
            movedItemId: itemId,
            pinnedIds: change.pinnedIds,
            previousPinnedIds: change.previousPinnedIds,
            toIndex,
          },
        });
      }
    },
    [controller],
  );

  const unpin = useCallback(
    (itemId: string) => {
      const change = controller.updateWindowsPinnedIds((currentPinnedIds) => {
        if (!currentPinnedIds.includes(itemId)) {
          return null;
        }

        return currentPinnedIds.filter((pinnedId) => pinnedId !== itemId);
      });

      if (change !== null) {
        controller.emitStateEvent({
          name: "windowUnpinFromStart",
          payload: { itemId, ...change },
        });
      }
    },
    [controller],
  );

  return useMemo(
    () => ({ applyReorder, isPinned, pin, pinnedIds, unpin }),
    [applyReorder, isPinned, pin, pinnedIds, unpin],
  );
};
