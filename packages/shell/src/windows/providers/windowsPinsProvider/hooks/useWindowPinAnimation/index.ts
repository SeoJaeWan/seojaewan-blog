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

import { WindowsItemsContext } from "../../../windowsItemsProvider/context";
import { WindowsPinsContext } from "../../context";

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

export interface UseWindowPinAnimation {
  /** Windows panel에 렌더할 pin item. stale item은 out 완료 전까지 snapshot을 유지한다. */
  pinnedItems: WindowItem[];
  /** 현재 item에 적용할 out/in visual phase. */
  pinnedItemAnimation: WindowsPanelPinnedItemAnimation | null;
  /** fade-in animation 완료를 현재 lifecycle에 전달한다. */
  onPinnedItemAnimationEnd: (event: AnimationEvent<HTMLButtonElement>, item: WindowItem) => void;
  /** out transition 완료를 현재 lifecycle에 전달한다. */
  onPinnedItemTransitionEnd: (event: TransitionEvent<HTMLButtonElement>, item: WindowItem) => void;
  /** out/in visual을 거쳐 item을 최종 index로 이동한다. */
  reorder: (itemId: string, toIndex: number) => void;
}

const arePinnedIdsEqual = (left: readonly string[], right: readonly string[]) =>
  left === right ||
  (left.length === right.length && left.every((itemId, index) => itemId === right[index]));

const useWindowPinAnimationContext = () => {
  const windowsItems = useContext(WindowsItemsContext);
  const pins = useContext(WindowsPinsContext);

  if (windowsItems === null || pins === null) {
    throw new Error("useWindowPinAnimation은 Windows 안에서 사용해야 합니다.");
  }

  return { pins, windowsItems };
};

/**
 * Windows panel의 pin item snapshot과 reorder/stale exit lifecycle을 소유한다.
 * Canonical pin ID는 windowsItems 변경 즉시 정리되고, 사라진 item snapshot만 out 완료까지 유지한다.
 */
export const useWindowPinAnimation = (): UseWindowPinAnimation => {
  const { pins, windowsItems } = useWindowPinAnimationContext();
  const [renderedPinnedIds, setRenderedPinnedIdsState] = useState<readonly string[]>(
    pins.pinnedIds,
  );
  const [transition, setTransitionState] = useState<PinTransition | null>(null);
  const [staleQueue, setStaleQueueState] = useState<readonly string[]>([]);
  const itemCacheRef = useRef(new Map<string, WindowItem>());
  const pinnedIdsRef = useRef(pins.pinnedIds);
  const renderedPinnedIdsRef = useRef(renderedPinnedIds);
  const staleQueueRef = useRef(staleQueue);
  const transitionRef = useRef(transition);

  const itemsById = useMemo(
    () => new Map(windowsItems.map((item) => [item.id, item])),
    [windowsItems],
  );
  const pinnedItems = useMemo(
    () =>
      renderedPinnedIds.flatMap((itemId) => {
        const item = itemsById.get(itemId) ?? itemCacheRef.current.get(itemId);
        return item ? [item] : [];
      }),
    [itemsById, renderedPinnedIds],
  );
  const staleRenderedIds = useMemo(
    () =>
      renderedPinnedIds.filter(
        (itemId) => !itemsById.has(itemId) && itemCacheRef.current.has(itemId),
      ),
    [itemsById, renderedPinnedIds],
  );

  const updateTransition = useCallback((nextTransition: PinTransition | null) => {
    transitionRef.current = nextTransition;
    setTransitionState(nextTransition);
  }, []);

  const updateStaleQueue = useCallback(
    (update: (current: readonly string[]) => readonly string[]) => {
      const currentQueue = staleQueueRef.current;
      const nextQueue = update(currentQueue);

      if (arePinnedIdsEqual(currentQueue, nextQueue)) {
        return;
      }

      staleQueueRef.current = nextQueue;
      setStaleQueueState(nextQueue);
    },
    [],
  );

  const updateRenderedPinnedIds = useCallback(
    (update: (current: readonly string[]) => readonly string[]) => {
      const currentPinnedIds = renderedPinnedIdsRef.current;
      const nextPinnedIds = update(currentPinnedIds);

      if (arePinnedIdsEqual(currentPinnedIds, nextPinnedIds)) {
        return;
      }

      renderedPinnedIdsRef.current = nextPinnedIds;
      setRenderedPinnedIdsState(nextPinnedIds);
    },
    [],
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
        updateRenderedPinnedIds((currentPinnedIds) =>
          currentPinnedIds.filter((pinnedId) => pinnedId !== itemId),
        );
        itemCacheRef.current.delete(itemId);
        updateTransition(null);
        return;
      }

      if (!arePinnedIdsEqual(pinnedIdsRef.current, currentTransition.baselinePinnedIds)) {
        updateTransition(null);
        return;
      }

      pins.applyReorder(itemId, currentTransition.toIndex);
      updateTransition({ ...currentTransition, phase: "in" });
    },
    [pins, updateRenderedPinnedIds, updateTransition],
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

  const reorder = useCallback(
    (itemId: string, toIndex: number) => {
      const pinnedIds = pinnedIdsRef.current;
      const fromIndex = pinnedIds.indexOf(itemId);

      if (
        transitionRef.current !== null ||
        staleQueueRef.current.length > 0 ||
        staleRenderedIds.length > 0 ||
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
    [staleRenderedIds.length, updateTransition],
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
    const currentRenderedIds = renderedPinnedIdsRef.current;
    const canonicalIdSet = new Set(pins.pinnedIds);

    for (const itemId of pins.pinnedIds) {
      const currentItem = itemsById.get(itemId);

      if (currentItem) {
        itemCacheRef.current.set(itemId, currentItem);
      }
    }

    const nextRenderedIds = [...pins.pinnedIds];

    currentRenderedIds.forEach((itemId, previousIndex) => {
      if (
        canonicalIdSet.has(itemId) ||
        itemsById.has(itemId) ||
        !itemCacheRef.current.has(itemId)
      ) {
        return;
      }

      nextRenderedIds.splice(Math.min(previousIndex, nextRenderedIds.length), 0, itemId);
    });

    updateRenderedPinnedIds(() => nextRenderedIds);
    pinnedIdsRef.current = pins.pinnedIds;

    const renderedIdSet = new Set(nextRenderedIds);
    for (const cachedItemId of itemCacheRef.current.keys()) {
      if (!renderedIdSet.has(cachedItemId)) {
        itemCacheRef.current.delete(cachedItemId);
      }
    }
  }, [itemsById, pins.pinnedIds, updateRenderedPinnedIds]);

  useEffect(() => {
    const staleIdSet = new Set(staleRenderedIds);
    const currentTransition = transitionRef.current;

    if (currentTransition?.kind === "stale" && !staleIdSet.has(currentTransition.itemId)) {
      updateTransition(null);
    } else if (currentTransition?.kind === "reorder" && staleIdSet.has(currentTransition.itemId)) {
      updateTransition(null);
    }

    updateStaleQueue((currentQueue) => {
      const activeStaleId =
        transitionRef.current?.kind === "stale" ? transitionRef.current.itemId : null;
      const nextQueue = currentQueue.filter((itemId) => staleIdSet.has(itemId));
      const queuedIds = new Set(nextQueue);

      for (const itemId of staleRenderedIds) {
        if (itemId !== activeStaleId && !queuedIds.has(itemId)) {
          nextQueue.push(itemId);
          queuedIds.add(itemId);
        }
      }

      return nextQueue;
    });
  }, [staleRenderedIds, updateStaleQueue, updateTransition]);

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
      reorder,
    }),
    [
      onPinnedItemAnimationEnd,
      onPinnedItemTransitionEnd,
      pinnedItemAnimation,
      pinnedItems,
      reorder,
    ],
  );
};
