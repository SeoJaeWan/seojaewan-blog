"use client";

import { useCallback, useContext, useMemo } from "react";

import { WindowsControllerContext, WindowsStateContext } from "../..";
import type {
  WindowMutableStateEvent,
  WindowPinEvent,
  WindowPinsReorderedEvent,
  WindowPinStatePatch,
  WindowPinTarget,
  WindowsState,
} from "../../types";

export interface UseWindowPinsResult {
  isPinned: (itemId: string) => boolean;
  pin: (itemId: string) => void;
  pinnedIds: readonly string[];
  reorder: (itemId: string, toIndex: number) => void;
  unpin: (itemId: string) => void;
}

const getPinnedIds = (state: WindowsState, target: WindowPinTarget) =>
  target === "windows" ? state.windowsPinnedIds : state.taskbarPinnedIds;

const createPinStatePatch = (
  target: WindowPinTarget,
  pinnedIds: readonly string[],
): WindowPinStatePatch =>
  target === "windows" ? { windowsPinnedIds: pinnedIds } : { taskbarPinnedIds: pinnedIds };

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
 * Target별 pin ID를 읽고 add/remove 계산, persistence와 Provider commit을 조립한다.
 *
 * @param target windows panel 또는 taskbar pin surface
 * @returns 현재 pin ID와 pin/unpin 동작
 */
export const useWindowPins = (target: WindowPinTarget): UseWindowPinsResult => {
  const state = useContext(WindowsStateContext);
  const controller = useContext(WindowsControllerContext);

  if (state === null || controller === null) {
    throw new Error("useWindowPins는 Windows 안에서 사용해야 합니다.");
  }

  const pinnedIds = getPinnedIds(state, target);

  const isPinned = useCallback((itemId: string) => pinnedIds.includes(itemId), [pinnedIds]);

  const pin = useCallback(
    (itemId: string) => {
      controller.commitState((currentState) => {
        const previousPinnedIds = getPinnedIds(currentState, target);

        if (
          previousPinnedIds.includes(itemId) ||
          !currentState.windowsItems.some((item) => item.id === itemId)
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
          patch: createPinStatePatch(target, nextPinnedIds),
        };
      });
    },
    [controller, target],
  );

  const reorder = useCallback(
    (itemId: string, toIndex: number) => {
      controller.commitState((currentState) => {
        const previousPinnedIds = getPinnedIds(currentState, target);
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
          patch: createPinStatePatch(target, nextPinnedIds),
        };
      });
    },
    [controller, target],
  );

  const unpin = useCallback(
    (itemId: string) => {
      controller.commitState((currentState) => {
        const previousPinnedIds = getPinnedIds(currentState, target);

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
          patch: createPinStatePatch(target, nextPinnedIds),
        };
      });
    },
    [controller, target],
  );

  return useMemo(
    () => ({ isPinned, pin, pinnedIds, reorder, unpin }),
    [isPinned, pin, pinnedIds, reorder, unpin],
  );
};
