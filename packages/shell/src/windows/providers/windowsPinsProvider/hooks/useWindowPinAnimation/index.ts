"use client";

import type { AnimationEvent, TransitionEvent } from "react";
import {
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useReducer,
  useRef,
} from "react";

import type { WindowItem, WindowsPanelPinnedItemAnimation } from "@window/ui";

import { WindowsItemsContext } from "../../../windowsItemsProvider/context";
import { WindowsPinsContext } from "../../context";
import { createPinAnimationState, pinAnimationReducer } from "./utils/pinAnimationReducer";

const PIN_ANIMATION_NAME = "wb-windows-fade-in";
const PIN_ANIMATION_WATCHDOG_MS = 500;

export interface UseWindowPinAnimation {
  /** Windows panel에 렌더할 visual pin item. 제거 중인 item은 out 완료 전까지 유지한다. */
  pinnedItems: WindowItem[];
  /** 현재 item에 적용할 out/in visual phase. */
  pinnedItemAnimation: WindowsPanelPinnedItemAnimation | null;
  /** fade-in animation 완료를 현재 visual lifecycle에 전달한다. */
  onPinnedItemAnimationEnd: (event: AnimationEvent<HTMLButtonElement>, item: WindowItem) => void;
  /** out transition 완료를 현재 visual lifecycle에 전달한다. */
  onPinnedItemTransitionEnd: (event: TransitionEvent<HTMLButtonElement>, item: WindowItem) => void;
}

const useWindowPinAnimationContext = () => {
  const windowsItems = useContext(WindowsItemsContext);
  const pins = useContext(WindowsPinsContext);

  if (windowsItems === null || pins === null) {
    throw new Error("useWindowPinAnimation은 Windows 안에서 사용해야 합니다.");
  }

  return { pins, windowsItems };
};

/** Canonical pin 변경을 out/in 단계가 있는 일시적인 visual 목록으로 투영한다. */
export const useWindowPinAnimation = (): UseWindowPinAnimation => {
  const { pins, windowsItems } = useWindowPinAnimationContext();
  const initialMutationRevisionRef = useRef(pins.mutation?.revision ?? 0);
  const [animationState, dispatchAnimation] = useReducer(
    pinAnimationReducer,
    pins.pinnedIds,
    (pinnedIds) => createPinAnimationState(pinnedIds, initialMutationRevisionRef.current),
  );
  const itemCacheRef = useRef(new Map<string, WindowItem>());
  const itemsById = useMemo(
    () => new Map(windowsItems.map((item) => [item.id, item])),
    [windowsItems],
  );
  const pinnedItems = useMemo(
    () =>
      animationState.renderedPinnedIds.flatMap((itemId) => {
        const item = itemsById.get(itemId) ?? itemCacheRef.current.get(itemId);
        return item ? [item] : [];
      }),
    [animationState.renderedPinnedIds, itemsById],
  );

  const completeAnimation = useCallback((itemId: string, phase: "in" | "out") => {
    dispatchAnimation({ itemId, phase, type: "complete" });
  }, []);

  const onPinnedItemTransitionEnd = useCallback(
    (event: TransitionEvent<HTMLButtonElement>, item: WindowItem) => {
      if (event.target !== event.currentTarget || event.propertyName !== "transform") {
        return;
      }

      completeAnimation(item.id, "out");
    },
    [completeAnimation],
  );

  const onPinnedItemAnimationEnd = useCallback(
    (event: AnimationEvent<HTMLButtonElement>, item: WindowItem) => {
      if (event.target !== event.currentTarget || event.animationName !== PIN_ANIMATION_NAME) {
        return;
      }

      completeAnimation(item.id, "in");
    },
    [completeAnimation],
  );

  useLayoutEffect(() => {
    const retainedIds = new Set([...animationState.renderedPinnedIds, ...pins.pinnedIds]);

    for (const itemId of retainedIds) {
      const item = itemsById.get(itemId);

      if (item) {
        itemCacheRef.current.set(itemId, item);
      }
    }

    for (const cachedItemId of itemCacheRef.current.keys()) {
      if (!retainedIds.has(cachedItemId)) {
        itemCacheRef.current.delete(cachedItemId);
      }
    }
  }, [animationState.renderedPinnedIds, itemsById, pins.pinnedIds]);

  useLayoutEffect(() => {
    dispatchAnimation({ mutation: pins.mutation, pinnedIds: pins.pinnedIds, type: "sync" });
  }, [pins.mutation, pins.pinnedIds]);

  useEffect(() => {
    const activeStep = animationState.activeStep;

    if (activeStep === null) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      completeAnimation(activeStep.itemId, activeStep.phase);
    }, PIN_ANIMATION_WATCHDOG_MS);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [animationState.activeStep, completeAnimation]);

  const pinnedItemAnimation = animationState.activeStep
    ? {
        itemId: animationState.activeStep.itemId,
        phase: animationState.activeStep.phase,
      }
    : null;

  return useMemo(
    () => ({
      onPinnedItemAnimationEnd,
      onPinnedItemTransitionEnd,
      pinnedItemAnimation,
      pinnedItems,
    }),
    [onPinnedItemAnimationEnd, onPinnedItemTransitionEnd, pinnedItemAnimation, pinnedItems],
  );
};
