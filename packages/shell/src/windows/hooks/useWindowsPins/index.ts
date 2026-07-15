"use client";

import { useCallback, useContext, useMemo } from "react";

import { WindowsControllerContext, WindowsStateContext } from "../..";
import type { WindowPinEvent } from "../../types";

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
      controller.updateWindowsPinnedIds((previousPinnedIds) => {
        if (
          previousPinnedIds.includes(itemId) ||
          !state.windowsItems.some((item) => item.id === itemId)
        ) {
          return null;
        }

        const nextPinnedIds = [...previousPinnedIds, itemId];
        const payload: WindowPinEvent = {
          itemId,
          pinnedIds: nextPinnedIds,
          previousPinnedIds,
        };

        return {
          event: { name: "windowPinToStart", payload },
          pinnedIds: nextPinnedIds,
        };
      });
    },
    [controller, state.windowsItems],
  );

  const applyReorder = useCallback(
    (itemId: string, toIndex: number) => {
      controller.updateWindowsPinnedIds((previousPinnedIds) => {
        const fromIndex = previousPinnedIds.indexOf(itemId);

        if (
          fromIndex === -1 ||
          !Number.isInteger(toIndex) ||
          toIndex < 0 ||
          toIndex >= previousPinnedIds.length ||
          fromIndex === toIndex
        ) {
          return null;
        }

        const nextPinnedIds = [...previousPinnedIds];
        nextPinnedIds.splice(fromIndex, 1);
        nextPinnedIds.splice(toIndex, 0, itemId);

        return {
          event: {
            name: "windowsPinsReordered",
            payload: {
              fromIndex,
              movedItemId: itemId,
              pinnedIds: nextPinnedIds,
              previousPinnedIds,
              toIndex,
            },
          },
          pinnedIds: nextPinnedIds,
        };
      });
    },
    [controller],
  );

  const unpin = useCallback(
    (itemId: string) => {
      controller.updateWindowsPinnedIds((previousPinnedIds) => {
        if (!previousPinnedIds.includes(itemId)) {
          return null;
        }

        const nextPinnedIds = previousPinnedIds.filter((pinnedId) => pinnedId !== itemId);
        const payload: WindowPinEvent = {
          itemId,
          pinnedIds: nextPinnedIds,
          previousPinnedIds,
        };

        return {
          event: { name: "windowUnpinFromStart", payload },
          pinnedIds: nextPinnedIds,
        };
      });
    },
    [controller],
  );

  return useMemo(
    () => ({ applyReorder, isPinned, pin, pinnedIds, unpin }),
    [applyReorder, isPinned, pin, pinnedIds, unpin],
  );
};
