"use client";

import type { AnimationEvent, TransitionEvent } from "react";
import {
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import type { WindowItem, WindowsPanelPinnedItemAnimation } from "@window/ui";

import { WindowsControllerContext, WindowsStateContext } from "../..";
import type { WindowPinStatePatch, WindowPinTarget, WindowsState } from "../../types";
import { useWindowPins } from "../useWindowPins";

const PIN_ANIMATION_NAME = "wb-windows-fade-in";
const PIN_ANIMATION_WATCHDOG_MS = 500;

interface ReorderTransition {
  baselinePinnedIds: readonly string[];
  itemId: string;
  kind: "reorder";
  phase: "in" | "out";
  toIndex: number;
}

interface StaleTransition {
  itemId: string;
  kind: "stale";
  phase: "out";
}

type PinTransition = ReorderTransition | StaleTransition;

export interface UseWindowPinnedItemsResult {
  /** 현재 surface에 렌더할 pin item. stale item은 out 완료 전까지 마지막 값을 유지한다. */
  pinnedItems: WindowItem[];
  /** 현재 item에 적용할 out/in visual phase. */
  pinnedItemAnimation: WindowsPanelPinnedItemAnimation | null;
  /** fade-in animation 완료를 현재 lifecycle에 전달한다. */
  onPinnedItemAnimationEnd: (
    event: AnimationEvent<HTMLButtonElement>,
    item: WindowItem,
  ) => void;
  /** out transition 완료를 현재 lifecycle에 전달한다. */
  onPinnedItemTransitionEnd: (
    event: TransitionEvent<HTMLButtonElement>,
    item: WindowItem,
  ) => void;
  /** out/in visual을 거쳐 item을 최종 index로 이동하도록 요청한다. */
  requestReorder: (itemId: string, toIndex: number) => void;
}

const getPinnedIds = (state: WindowsState, target: WindowPinTarget) =>
  target === "windows" ? state.windowsPinnedIds : state.taskbarPinnedIds;

const createPinStatePatch = (
  target: WindowPinTarget,
  pinnedIds: readonly string[],
): WindowPinStatePatch =>
  target === "windows" ? { windowsPinnedIds: pinnedIds } : { taskbarPinnedIds: pinnedIds };

const arePinnedIdsEqual = (left: readonly string[], right: readonly string[]) =>
  left === right ||
  (left.length === right.length && left.every((itemId, index) => itemId === right[index]));

/**
 * target surface의 pin item cache와 reorder/stale exit lifecycle을 소유한다.
 * Provider pin 배열은 out 완료 뒤에만 변경하고 animation event가 누락되면 watchdog으로 완료한다.
 */
export const useWindowPinnedItems = (
  target: WindowPinTarget,
): UseWindowPinnedItemsResult => {
  const state = useContext(WindowsStateContext);
  const controller = useContext(WindowsControllerContext);
  const pins = useWindowPins(target);
  const [transition, setTransitionState] = useState<PinTransition | null>(null);
  const [staleQueue, setStaleQueueState] = useState<readonly string[]>([]);
  const itemCacheRef = useRef(new Map<string, WindowItem>());
  const pinnedIdsRef = useRef(pins.pinnedIds);
  const staleQueueRef = useRef(staleQueue);
  const transitionRef = useRef(transition);

  if (state === null || controller === null) {
    throw new Error("useWindowPinnedItems는 Windows 안에서 사용해야 합니다.");
  }

  const itemsById = useMemo(
    () => new Map(state.windowsItems.map((item) => [item.id, item])),
    [state.windowsItems],
  );
  const missingPinnedIds = useMemo(
    () => pins.pinnedIds.filter((itemId) => !itemsById.has(itemId)),
    [itemsById, pins.pinnedIds],
  );
  const pinnedItems = useMemo(
    () =>
      pins.pinnedIds.flatMap((itemId) => {
        const item = itemsById.get(itemId) ?? itemCacheRef.current.get(itemId);
        return item ? [item] : [];
      }),
    [itemsById, pins.pinnedIds],
  );

  const updateTransition = useCallback((nextTransition: PinTransition | null) => {
    transitionRef.current = nextTransition;
    setTransitionState(nextTransition);
  }, []);

  const updateStaleQueue = useCallback(
    (update: (current: readonly string[]) => readonly string[]) => {
      const currentQueue = staleQueueRef.current;
      const nextQueue = update(currentQueue);

      if (nextQueue === currentQueue) {
        return;
      }

      staleQueueRef.current = nextQueue;
      setStaleQueueState(nextQueue);
    },
    [],
  );

  const removeMissingPinnedIds = useCallback(
    (itemIds: readonly string[]) => {
      const requestedIds = new Set(itemIds);

      controller.commitState((currentState) => {
        const previousPinnedIds = getPinnedIds(currentState, target);
        const availableItemIds = new Set(currentState.windowsItems.map((item) => item.id));
        const nextPinnedIds = previousPinnedIds.filter(
          (itemId) => !requestedIds.has(itemId) || availableItemIds.has(itemId),
        );

        if (nextPinnedIds.length === previousPinnedIds.length) {
          return null;
        }

        return {
          event: null,
          patch: createPinStatePatch(target, nextPinnedIds),
        };
      });
    },
    [controller, target],
  );

  const completeOutTransition = useCallback(
    (itemId: string) => {
      const currentTransition = transitionRef.current;

      if (
        currentTransition === null ||
        currentTransition.phase !== "out" ||
        currentTransition.itemId !== itemId
      ) {
        return;
      }

      if (currentTransition.kind === "stale") {
        removeMissingPinnedIds([itemId]);
        updateTransition(null);
        return;
      }

      if (!arePinnedIdsEqual(pinnedIdsRef.current, currentTransition.baselinePinnedIds)) {
        updateTransition(null);
        return;
      }

      pins.reorder(itemId, currentTransition.toIndex);
      updateTransition({ ...currentTransition, phase: "in" });
    },
    [pins, removeMissingPinnedIds, updateTransition],
  );

  const completeInAnimation = useCallback(
    (itemId: string) => {
      const currentTransition = transitionRef.current;

      if (
        currentTransition?.kind === "reorder" &&
        currentTransition.phase === "in" &&
        currentTransition.itemId === itemId
      ) {
        updateTransition(null);
      }
    },
    [updateTransition],
  );

  const requestReorder = useCallback(
    (itemId: string, toIndex: number) => {
      const pinnedIds = pinnedIdsRef.current;
      const fromIndex = pinnedIds.indexOf(itemId);

      if (
        transitionRef.current !== null ||
        staleQueueRef.current.length > 0 ||
        missingPinnedIds.length > 0 ||
        fromIndex === -1 ||
        !Number.isInteger(toIndex) ||
        toIndex < 0 ||
        toIndex >= pinnedIds.length ||
        fromIndex === toIndex
      ) {
        return;
      }

      updateTransition({
        baselinePinnedIds: [...pinnedIds],
        itemId,
        kind: "reorder",
        phase: "out",
        toIndex,
      });
    },
    [missingPinnedIds.length, updateTransition],
  );

  const onPinnedItemTransitionEnd = useCallback(
    (event: TransitionEvent<HTMLButtonElement>, item: WindowItem) => {
      if (event.target !== event.currentTarget || event.propertyName !== "transform") {
        return;
      }

      completeOutTransition(item.id);
    },
    [completeOutTransition],
  );

  const onPinnedItemAnimationEnd = useCallback(
    (event: AnimationEvent<HTMLButtonElement>, item: WindowItem) => {
      if (event.target !== event.currentTarget || event.animationName !== PIN_ANIMATION_NAME) {
        return;
      }

      completeInAnimation(item.id);
    },
    [completeInAnimation],
  );

  useLayoutEffect(() => {
    const pinnedIdSet = new Set(pins.pinnedIds);

    for (const itemId of pinnedIdSet) {
      const currentItem = itemsById.get(itemId);

      if (currentItem) {
        itemCacheRef.current.set(itemId, currentItem);
      }
    }

    for (const cachedItemId of itemCacheRef.current.keys()) {
      if (!pinnedIdSet.has(cachedItemId)) {
        itemCacheRef.current.delete(cachedItemId);
      }
    }

    pinnedIdsRef.current = pins.pinnedIds;
  }, [itemsById, pins.pinnedIds]);

  useEffect(() => {
    const missingIdSet = new Set(missingPinnedIds);
    const currentTransition = transitionRef.current;

    if (
      currentTransition?.kind === "stale" &&
      !missingIdSet.has(currentTransition.itemId)
    ) {
      updateTransition(null);
    } else if (
      currentTransition?.kind === "reorder" &&
      missingIdSet.has(currentTransition.itemId)
    ) {
      updateTransition(null);
    }

    const unknownMissingIds = missingPinnedIds.filter(
      (itemId) => !itemCacheRef.current.has(itemId),
    );

    if (unknownMissingIds.length > 0) {
      removeMissingPinnedIds(unknownMissingIds);
    }

    const animatableMissingIds = missingPinnedIds.filter((itemId) =>
      itemCacheRef.current.has(itemId),
    );

    updateStaleQueue((currentQueue) => {
      const activeStaleId =
        transitionRef.current?.kind === "stale" ? transitionRef.current.itemId : null;
      const nextQueue = currentQueue.filter((itemId) => missingIdSet.has(itemId));
      const queuedIds = new Set(nextQueue);

      for (const itemId of animatableMissingIds) {
        if (itemId !== activeStaleId && !queuedIds.has(itemId)) {
          nextQueue.push(itemId);
          queuedIds.add(itemId);
        }
      }

      return arePinnedIdsEqual(currentQueue, nextQueue) ? currentQueue : nextQueue;
    });
  }, [
    missingPinnedIds,
    removeMissingPinnedIds,
    updateStaleQueue,
    updateTransition,
  ]);

  useEffect(() => {
    if (transition !== null || staleQueue.length === 0) {
      return;
    }

    const [itemId, ...nextQueue] = staleQueue;
    updateStaleQueue(() => nextQueue);
    updateTransition({ itemId, kind: "stale", phase: "out" });
  }, [staleQueue, transition, updateStaleQueue, updateTransition]);

  useEffect(() => {
    if (transition === null) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      if (transition.phase === "out") {
        completeOutTransition(transition.itemId);
      } else {
        completeInAnimation(transition.itemId);
      }
    }, PIN_ANIMATION_WATCHDOG_MS);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [completeInAnimation, completeOutTransition, transition]);

  const pinnedItemAnimation = transition
    ? { itemId: transition.itemId, phase: transition.phase }
    : null;

  return useMemo(
    () => ({
      onPinnedItemAnimationEnd,
      onPinnedItemTransitionEnd,
      pinnedItemAnimation,
      pinnedItems,
      requestReorder,
    }),
    [
      onPinnedItemAnimationEnd,
      onPinnedItemTransitionEnd,
      pinnedItemAnimation,
      pinnedItems,
      requestReorder,
    ],
  );
};
