/**
 * @file Start pinned grid의 roving focus와 6열 keyboard 이동을 소유한다.
 */
import { type KeyboardEvent, type RefCallback, useCallback, useRef } from "react";

const PINNED_COLUMN_COUNT = 6;

/** Start pinned item ref와 keyboard handler를 제공한다. */
export type StartPinnedKeyboardController = Readonly<{
  getItemRef(index: number): RefCallback<HTMLButtonElement>;
  handleKeyDown(event: KeyboardEvent<HTMLButtonElement>, index: number): void;
}>;

/**
 * DOM 순서를 semantic grid 순서로 사용해 Arrow, Home과 End focus 이동을 수행한다.
 */
export const useStartPinnedKeyboard = (itemCount: number): StartPinnedKeyboardController => {
  const itemElementsRef = useRef(new Map<number, HTMLButtonElement>());

  const getItemRef = useCallback(
    (index: number): RefCallback<HTMLButtonElement> =>
      (element) => {
        if (element === null) itemElementsRef.current.delete(index);
        else itemElementsRef.current.set(index, element);
      },
    [],
  );

  const handleKeyDown = useCallback(
    (event: KeyboardEvent<HTMLButtonElement>, index: number): void => {
      let destination: number | null = null;
      switch (event.key) {
        case "ArrowLeft":
          destination = Math.max(0, index - 1);
          break;
        case "ArrowRight":
          destination = Math.min(itemCount - 1, index + 1);
          break;
        case "ArrowUp":
          destination = Math.max(0, index - PINNED_COLUMN_COUNT);
          break;
        case "ArrowDown":
          destination = Math.min(itemCount - 1, index + PINNED_COLUMN_COUNT);
          break;
        case "Home":
          destination = event.ctrlKey ? 0 : index - (index % PINNED_COLUMN_COUNT);
          break;
        case "End": {
          const rowEnd = index + (PINNED_COLUMN_COUNT - 1 - (index % PINNED_COLUMN_COUNT));
          destination = event.ctrlKey ? itemCount - 1 : Math.min(itemCount - 1, rowEnd);
          break;
        }
      }
      if (destination === null || destination === index) return;
      event.preventDefault();
      itemElementsRef.current.get(destination)?.focus();
    },
    [itemCount],
  );

  return { getItemRef, handleKeyDown };
};
