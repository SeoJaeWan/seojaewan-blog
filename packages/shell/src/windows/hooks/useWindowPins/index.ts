"use client";

import { useCallback, useContext, useMemo } from "react";

import { WindowsControllerContext, WindowsStateContext } from "../..";
import type {
  WindowMutableStateEvent,
  WindowPinEvent,
  WindowPinsReorderedEvent,
  WindowPinTarget,
  WindowsState,
} from "../../types";

export interface UseWindowPins {
  /** Animation 완료 뒤 실제 target 순서를 반영한다. */
  applyReorder: (itemId: string, toIndex: number) => void;
  isPinned: (itemId: string) => boolean;
  pin: (itemId: string) => void;
  pinnedIds: readonly string[];
  unpin: (itemId: string) => void;
}

const getPinnedIds = (state: WindowsState, target: WindowPinTarget) =>
  target === "windows" ? state.windowsPinnedIds : state.taskbarPinnedIds;

const createPinEvent = (
  target: WindowPinTarget,
  payload: WindowPinEvent,
): WindowMutableStateEvent =>
  target === "windows"
    ? { name: "windowPinToStart", payload }
    : { name: "windowPinToTaskbar", payload };

const createUnpinEvent = (
  target: WindowPinTarget,
  payload: WindowPinEvent,
): WindowMutableStateEvent =>
  target === "windows"
    ? { name: "windowUnpinFromStart", payload }
    : { name: "windowUnpinFromTaskbar", payload };

const createReorderedEvent = (
  target: WindowPinTarget,
  payload: WindowPinsReorderedEvent,
): WindowMutableStateEvent =>
  target === "windows"
    ? { name: "windowsPinsReordered", payload }
    : { name: "taskbarPinsReordered", payload };

/**
 * Target별 pin ID를 읽고 add/remove와 완료된 reorder update를 계산한다.
 *
 * @param target windows panel 또는 taskbar pin surface
 * @returns 현재 pin ID와 pin/unpin 동작
 */
export const useWindowPins = (target: WindowPinTarget): UseWindowPins => {
  const state = useContext(WindowsStateContext);
  const controller = useContext(WindowsControllerContext);

  if (state === null || controller === null) {
    throw new Error("useWindowPins는 Windows 안에서 사용해야 합니다.");
  }

  const pinnedIds = getPinnedIds(state, target);

  const isPinned = useCallback((itemId: string) => pinnedIds.includes(itemId), [pinnedIds]);

  const pin = useCallback(
    (itemId: string) => {
      controller.updatePinnedIds(target, (previousPinnedIds) => {
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
          event: createPinEvent(target, payload),
          pinnedIds: nextPinnedIds,
        };
      });
    },
    [controller, state.windowsItems, target],
  );

  const applyReorder = useCallback(
    (itemId: string, toIndex: number) => {
      controller.updatePinnedIds(target, (previousPinnedIds) => {
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
          event: createReorderedEvent(target, {
            fromIndex,
            movedItemId: itemId,
            pinnedIds: nextPinnedIds,
            previousPinnedIds,
            toIndex,
          }),
          pinnedIds: nextPinnedIds,
        };
      });
    },
    [controller, target],
  );

  const unpin = useCallback(
    (itemId: string) => {
      controller.updatePinnedIds(target, (previousPinnedIds) => {
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
          event: createUnpinEvent(target, payload),
          pinnedIds: nextPinnedIds,
        };
      });
    },
    [controller, target],
  );

  return useMemo(
    () => ({ applyReorder, isPinned, pin, pinnedIds, unpin }),
    [applyReorder, isPinned, pin, pinnedIds, unpin],
  );
};
