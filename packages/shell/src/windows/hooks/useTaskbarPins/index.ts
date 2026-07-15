"use client";

import { useCallback, useContext, useMemo } from "react";

import { WindowsControllerContext, WindowsStateContext } from "../..";
import type { WindowPinEvent } from "../../types";

export interface UseTaskbarPins {
  isPinned: (itemId: string) => boolean;
  pin: (itemId: string) => void;
  pinnedIds: readonly string[];
  unpin: (itemId: string) => void;
}

/** Taskbar pin ID와 등록/취소 update만 제공한다. */
export const useTaskbarPins = (): UseTaskbarPins => {
  const state = useContext(WindowsStateContext);
  const controller = useContext(WindowsControllerContext);

  if (state === null || controller === null) {
    throw new Error("useTaskbarPins는 Windows 안에서 사용해야 합니다.");
  }

  const pinnedIds = state.taskbarPinnedIds;
  const isPinned = useCallback((itemId: string) => pinnedIds.includes(itemId), [pinnedIds]);

  const pin = useCallback(
    (itemId: string) => {
      controller.updateTaskbarPinnedIds((previousPinnedIds) => {
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
          event: { name: "windowPinToTaskbar", payload },
          pinnedIds: nextPinnedIds,
        };
      });
    },
    [controller, state.windowsItems],
  );

  const unpin = useCallback(
    (itemId: string) => {
      controller.updateTaskbarPinnedIds((previousPinnedIds) => {
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
          event: { name: "windowUnpinFromTaskbar", payload },
          pinnedIds: nextPinnedIds,
        };
      });
    },
    [controller],
  );

  return useMemo(() => ({ isPinned, pin, pinnedIds, unpin }), [isPinned, pin, pinnedIds, unpin]);
};
