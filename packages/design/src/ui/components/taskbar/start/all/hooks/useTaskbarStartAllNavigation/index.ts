/**
 * @file Start 모두 보기의 heading ref, category scroll, overlay keyboard와 focus 복원을 관리한다.
 *
 * semantic index open 상태는 호출자가 소유하며 이 hook은 DOM interaction만 수행한다.
 */
import type { KeyboardEvent, PointerEvent, RefObject } from "react";
import { useEffect, useRef } from "react";

import {
  START_SCREEN_GROUP_ORDER,
  type StartScreenGroupKey,
} from "../../../../../../../headless/index.js";

const INDEX_COLUMN_COUNT = 4;

/** Start All navigation hook에 필요한 controlled semantic state와 Action callback이다. */
export type UseTaskbarStartAllNavigationOptions = Readonly<{
  indexOpen: boolean;
  onIndexOpenChange: (open: boolean) => void;
}>;

/** Start All Component가 DOM에 연결할 ref와 interaction callback이다. */
export type TaskbarStartAllNavigation = Readonly<{
  listRef: RefObject<HTMLDivElement | null>;
  overlayRef: RefObject<HTMLDivElement | null>;
  setHeadingElement: (key: StartScreenGroupKey, element: HTMLButtonElement | null) => void;
  openIndex: (trigger: HTMLButtonElement) => void;
  selectCategory: (key: StartScreenGroupKey) => void;
  dismissIndex: () => void;
  onOverlayKeyDown: (event: KeyboardEvent<HTMLDivElement>) => void;
  onOverlayPointerDown: (event: PointerEvent<HTMLDivElement>) => void;
}>;

/** 연결된 category button 중 현재 key에서 주어진 간격으로 이동할 다음 button을 찾는다. */
const findCategoryButton = (
  currentKey: StartScreenGroupKey,
  step: number,
  overlay: HTMLDivElement,
): HTMLButtonElement | null => {
  const currentIndex = START_SCREEN_GROUP_ORDER.indexOf(currentKey);
  for (let distance = 1; distance <= START_SCREEN_GROUP_ORDER.length; distance += 1) {
    const index =
      (currentIndex + step * distance + START_SCREEN_GROUP_ORDER.length * distance) %
      START_SCREEN_GROUP_ORDER.length;
    const key = START_SCREEN_GROUP_ORDER[index];
    if (key === undefined) continue;
    const button = overlay.querySelector<HTMLButtonElement>(
      `[data-start-index-category="${key}"]:not(:disabled)`,
    );
    if (button !== null) return button;
  }
  return null;
};

/** Start 모두 보기의 실제 scroll, overlay keyboard와 focus restore lifecycle을 제공한다. */
export const useTaskbarStartAllNavigation = ({
  indexOpen,
  onIndexOpenChange,
}: UseTaskbarStartAllNavigationOptions): TaskbarStartAllNavigation => {
  const listRef = useRef<HTMLDivElement | null>(null);
  const overlayRef = useRef<HTMLDivElement | null>(null);
  const headingElementsRef = useRef(new Map<StartScreenGroupKey, HTMLButtonElement>());
  const restoreTargetRef = useRef<HTMLElement | null>(null);
  const previousIndexOpenRef = useRef(indexOpen);

  useEffect(() => {
    const wasOpen = previousIndexOpenRef.current;
    previousIndexOpenRef.current = indexOpen;
    if (wasOpen === indexOpen) return;

    const frame = requestAnimationFrame(() => {
      if (indexOpen) {
        overlayRef.current
          ?.querySelector<HTMLButtonElement>("[data-start-index-category]:not(:disabled)")
          ?.focus();
        return;
      }

      const target = restoreTargetRef.current;
      restoreTargetRef.current = null;
      if (target?.isConnected) target.focus();
      else if (listRef.current?.isConnected) listRef.current.focus();
    });

    return () => cancelAnimationFrame(frame);
  }, [indexOpen]);

  const setHeadingElement = (key: StartScreenGroupKey, element: HTMLButtonElement | null) => {
    if (element === null) headingElementsRef.current.delete(key);
    else headingElementsRef.current.set(key, element);
  };

  const openIndex = (trigger: HTMLButtonElement) => {
    restoreTargetRef.current = trigger;
    onIndexOpenChange(true);
  };

  const dismissIndex = () => {
    onIndexOpenChange(false);
  };

  const selectCategory = (key: StartScreenGroupKey) => {
    const list = listRef.current;
    const heading = headingElementsRef.current.get(key);
    if (list !== null && heading !== undefined) {
      list.scrollTo({ behavior: "smooth", top: heading.offsetTop - list.offsetTop });
      restoreTargetRef.current = heading;
    }
    onIndexOpenChange(false);
  };

  const onOverlayKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Escape") {
      event.preventDefault();
      event.stopPropagation();
      dismissIndex();
      return;
    }

    const overlay = overlayRef.current;
    const target = event.target;
    if (overlay === null || !(target instanceof HTMLButtonElement)) return;
    const key = target.dataset.startIndexCategory as StartScreenGroupKey | undefined;
    if (key === undefined) return;

    let next: HTMLButtonElement | null = null;
    if (event.key === "ArrowRight") next = findCategoryButton(key, 1, overlay);
    else if (event.key === "ArrowLeft") next = findCategoryButton(key, -1, overlay);
    else if (event.key === "ArrowDown") next = findCategoryButton(key, INDEX_COLUMN_COUNT, overlay);
    else if (event.key === "ArrowUp") next = findCategoryButton(key, -INDEX_COLUMN_COUNT, overlay);
    else if (event.key === "Home") {
      next = overlay.querySelector<HTMLButtonElement>("[data-start-index-category]:not(:disabled)");
    } else if (event.key === "End") {
      const buttons = overlay.querySelectorAll<HTMLButtonElement>(
        "[data-start-index-category]:not(:disabled)",
      );
      next = buttons.item(buttons.length - 1);
    } else if (event.key === "Tab") {
      const buttons = [
        ...overlay.querySelectorAll<HTMLButtonElement>(
          "[data-start-index-category]:not(:disabled)",
        ),
      ];
      const currentIndex = buttons.indexOf(target);
      const nextIndex = event.shiftKey
        ? (currentIndex - 1 + buttons.length) % buttons.length
        : (currentIndex + 1) % buttons.length;
      next = buttons[nextIndex] ?? null;
    }

    if (next !== null) {
      event.preventDefault();
      next.focus();
    }
  };

  const onOverlayPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (event.target === event.currentTarget) dismissIndex();
  };

  return {
    dismissIndex,
    listRef,
    onOverlayKeyDown,
    onOverlayPointerDown,
    openIndex,
    overlayRef,
    selectCategory,
    setHeadingElement,
  };
};
