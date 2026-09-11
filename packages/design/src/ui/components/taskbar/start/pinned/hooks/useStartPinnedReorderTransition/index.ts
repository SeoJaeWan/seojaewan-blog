import { useCallback, useEffect, useLayoutEffect, useRef } from "react";

import type {
  StartControllerActions,
  StartOperationHandle,
} from "../../../../../../../headless/index.js";
import type { StartPinnedItemViewModel } from "../../index.js";
import {
  measurePinnedItemRects,
  pinnedItemKey,
} from "../../utils/startPinnedDragGeometry/index.js";

type PendingReorder = {
  beforeRects: ReadonlyMap<string, DOMRect>;
  cleanupMove: (() => void) | null;
  handle: StartOperationHandle;
  phase: "start-reorder-measure-before" | "start-reorder-measure-after" | "start-reorder-move";
  signalFrame: number | null;
};

type UseStartPinnedReorderTransitionOptions = Readonly<{
  actions: StartControllerActions;
  elements: Readonly<{ current: Map<string, HTMLButtonElement> }>;
  items: readonly StartPinnedItemViewModel[];
}>;

const MOVE_DURATION_MS = 150;
const MOVE_WATCHDOG_MS = MOVE_DURATION_MS + 100;

/**
 * Start reorder의 measure-before, commit, measure-after, FLIP move 생명주기를 소유한다.
 */
export const useStartPinnedReorderTransition = ({
  actions,
  elements,
  items,
}: UseStartPinnedReorderTransitionOptions) => {
  const pendingRef = useRef<PendingReorder | null>(null);

  /**
   * Reorder handle을 첫 측정 phase에 연결하고 commit 뒤 다음 측정 phase를 연다.
   */
  const trackReorder = useCallback(
    (handle: StartOperationHandle, beforeRects: ReadonlyMap<string, DOMRect>): void => {
      const pending: PendingReorder = {
        beforeRects,
        cleanupMove: null,
        handle,
        phase: "start-reorder-measure-before",
        signalFrame: null,
      };
      pendingRef.current = pending;
      const signalMeasurement = (): void => {
        if (pendingRef.current !== pending) return;
        if (actions.completeTransition(handle.operationId, pending.phase)) {
          pending.signalFrame = null;
          pending.phase = "start-reorder-measure-after";
        } else {
          pending.signalFrame = requestAnimationFrame(signalMeasurement);
        }
      };
      queueMicrotask(signalMeasurement);
      void handle.committed.then((result) => {
        if (pendingRef.current !== pending || result.status === "committed") return;
        if (pending.signalFrame !== null) cancelAnimationFrame(pending.signalFrame);
        pendingRef.current = null;
      });
    },
    [actions],
  );

  /**
   * Pointer gesture가 새 reorder를 시작할 수 있는지 현재 transition 유무로 판정한다.
   */
  const hasPendingReorder = useCallback((): boolean => pendingRef.current !== null, []);

  useLayoutEffect(() => {
    const pending = pendingRef.current;
    if (pending === null || pending.phase !== "start-reorder-measure-after") return undefined;
    const afterRects = measurePinnedItemRects(items, elements.current);
    if (!actions.completeTransition(pending.handle.operationId, pending.phase)) return undefined;
    pending.phase = "start-reorder-move";

    const moving = items.flatMap((item) => {
      const key = pinnedItemKey(item);
      const element = elements.current.get(key);
      const before = pending.beforeRects.get(key);
      const after = afterRects.get(key);
      if (element === undefined || before === undefined || after === undefined) return [];
      const x = before.left - after.left;
      const y = before.top - after.top;
      return x === 0 && y === 0 ? [] : [{ element, key, x, y }];
    });

    let frame: number | null = null;
    let timeout: ReturnType<typeof setTimeout> | null = null;
    let settled = false;
    const remaining = new Set(moving.map(({ key }) => key));

    /**
     * FLIP transition이 추가한 inline style을 모두 제거한다.
     */
    const cleanStyles = (): void => {
      moving.forEach(({ element }) => {
        element.style.removeProperty("transition");
        element.style.removeProperty("transform");
        element.style.removeProperty("will-change");
      });
    };

    /**
     * Move transition을 한 번 완료하고 pending operation을 해제한다.
     */
    const finish = (): void => {
      if (settled) return;
      settled = true;
      if (frame !== null) cancelAnimationFrame(frame);
      if (timeout !== null) clearTimeout(timeout);
      moving.forEach(({ element }) =>
        element.removeEventListener("transitionend", onTransitionEnd),
      );
      cleanStyles();
      if (pendingRef.current === pending) pendingRef.current = null;
      actions.completeTransition(pending.handle.operationId, pending.phase);
    };

    /**
     * 각 tile의 transform 종료를 모아 마지막 tile에서 move phase를 완료한다.
     */
    function onTransitionEnd(event: TransitionEvent): void {
      if (event.propertyName !== "transform") return;
      const element = event.currentTarget;
      if (!(element instanceof HTMLButtonElement)) return;
      const key = element.dataset.resourceKey;
      if (key !== undefined) remaining.delete(key);
      if (remaining.size === 0) finish();
    }

    moving.forEach(({ element, x, y }) => {
      element.style.transition = "none";
      element.style.transform = `translate(${x}px, ${y}px)`;
      element.style.willChange = "transform";
      element.addEventListener("transitionend", onTransitionEnd);
    });
    void elements.current.values().next().value?.offsetWidth;
    frame = requestAnimationFrame(() => {
      moving.forEach(({ element }) => {
        element.style.transition = `transform ${MOVE_DURATION_MS}ms ease-in-out`;
        element.style.transform = "translate(0, 0)";
      });
      timeout = setTimeout(finish, MOVE_WATCHDOG_MS);
      if (moving.length === 0) queueMicrotask(finish);
    });
    pending.cleanupMove = () => {
      settled = true;
      if (frame !== null) cancelAnimationFrame(frame);
      if (timeout !== null) clearTimeout(timeout);
      moving.forEach(({ element }) =>
        element.removeEventListener("transitionend", onTransitionEnd),
      );
      cleanStyles();
    };

    return undefined;
  }, [actions, elements, items]);

  useEffect(
    () => () => {
      const pending = pendingRef.current;
      if (pending === null) return;
      if (pending.signalFrame !== null) cancelAnimationFrame(pending.signalFrame);
      pending.cleanupMove?.();
      actions.abortTransition(
        pending.handle.operationId,
        pending.phase,
        "start-pinned-component-unmounted",
      );
      pendingRef.current = null;
    },
    [actions],
  );

  return { hasPendingReorder, trackReorder } as const;
};
