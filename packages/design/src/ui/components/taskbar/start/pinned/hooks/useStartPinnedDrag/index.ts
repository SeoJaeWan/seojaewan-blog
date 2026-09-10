/**
 * @file Start pinned reorder의 pointer capture, DOM 측정과 FLIP transition을 소유한다.
 */
import {
  type PointerEvent as ReactPointerEvent,
  type RefCallback,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";

import type {
  StartControllerActions,
  StartOperationHandle,
} from "../../../../../../../headless/index.js";
import type { StartPinnedItemViewModel } from "../../index.js";

type DragOwner = HTMLButtonElement & {
  hasPointerCapture?(pointerId: number): boolean;
  releasePointerCapture?(pointerId: number): void;
  setPointerCapture?(pointerId: number): void;
};

type DragGesture = {
  active: boolean;
  animationFrame: number | null;
  beforeRects: ReadonlyMap<string, DOMRect>;
  itemIndex: number;
  key: string;
  lastPointer: Readonly<{ x: number; y: number }>;
  listeners: Readonly<{
    keyDown: (event: KeyboardEvent) => void;
    lostPointerCapture: (event: PointerEvent) => void;
    pointerCancel: (event: PointerEvent) => void;
    pointerMove: (event: PointerEvent) => void;
    pointerUp: (event: PointerEvent) => void;
  }>;
  owner: DragOwner;
  pendingPointer: Readonly<{ x: number; y: number }> | null;
  pointerId: number;
  startPointer: Readonly<{ x: number; y: number }>;
};

type PendingReorder = {
  beforeRects: ReadonlyMap<string, DOMRect>;
  cleanupMove: (() => void) | null;
  handle: StartOperationHandle;
  phase: "start-reorder-measure-before" | "start-reorder-measure-after" | "start-reorder-move";
  signalFrame: number | null;
};

type DragVisual = Readonly<{ key: string; x: number; y: number }> | null;

type StartPinnedDragOptions = Readonly<{
  actions: StartControllerActions;
  items: readonly StartPinnedItemViewModel[];
}>;

/** Start pinned item에 연결할 ref, pointer handler와 drag 표현 상태다. */
export type StartPinnedDragController = Readonly<{
  consumeClickSuppression(): boolean;
  dragVisual: DragVisual;
  getItemRef(key: string): RefCallback<HTMLButtonElement>;
  handlePointerDown(
    event: ReactPointerEvent<HTMLButtonElement>,
    item: StartPinnedItemViewModel,
    index: number,
  ): void;
  isDragging: boolean;
}>;

const MOVE_ACTIVATION_DISTANCE = 4;
const MOVE_DURATION_MS = 150;
const MOVE_WATCHDOG_MS = MOVE_DURATION_MS + 100;

/** ResourceRef를 DOM map에서 충돌하지 않는 key로 바꾼다. */
const itemKey = (item: StartPinnedItemViewModel): string =>
  `${item.resource.kind}:${item.resource.id}`;

/** 현재 item DOM rect를 표시 순서와 같은 key map으로 측정한다. */
const measureItems = (
  items: readonly StartPinnedItemViewModel[],
  elements: ReadonlyMap<string, HTMLButtonElement>,
): ReadonlyMap<string, DOMRect> =>
  new Map(
    items.flatMap((item) => {
      const element = elements.get(itemKey(item));
      return element === undefined ? [] : ([[itemKey(item), element.getBoundingClientRect()]] as const);
    }),
  );

/** pointer와 가장 가까운 tile center의 표시 index를 찾는다. */
const destinationIndex = (
  pointer: Readonly<{ x: number; y: number }>,
  items: readonly StartPinnedItemViewModel[],
  rects: ReadonlyMap<string, DOMRect>,
): number => {
  let destination = 0;
  let distance = Number.POSITIVE_INFINITY;
  items.forEach((item, index) => {
    const rect = rects.get(itemKey(item));
    if (rect === undefined) return;
    const nextDistance = Math.hypot(
      pointer.x - (rect.left + rect.width / 2),
      pointer.y - (rect.top + rect.height / 2),
    );
    if (nextDistance < distance) {
      destination = index;
      distance = nextDistance;
    }
  });
  return destination;
};

/** capture API가 있는 browser에서 현재 pointer capture를 안전하게 반환한다. */
const releasePointerCapture = (owner: DragOwner, pointerId: number): void => {
  try {
    if (owner.hasPointerCapture?.(pointerId)) owner.releasePointerCapture?.(pointerId);
  } catch {
    // capture가 이미 browser에서 해제된 경우에도 나머지 listener cleanup은 완료돼 있다.
  }
};

/**
 * pointer reorder를 Start Action과 measure-before → commit → measure-after → move 순서로 연결한다.
 */
export const useStartPinnedDrag = ({
  actions,
  items,
}: StartPinnedDragOptions): StartPinnedDragController => {
  const elementsRef = useRef(new Map<string, HTMLButtonElement>());
  const gestureRef = useRef<DragGesture | null>(null);
  const pendingReorderRef = useRef<PendingReorder | null>(null);
  const itemsRef = useRef(items);
  const mountedRef = useRef(true);
  const suppressClickRef = useRef(false);
  const [dragVisual, setDragVisual] = useState<DragVisual>(null);
  const [isDragging, setIsDragging] = useState(false);
  itemsRef.current = items;

  const getItemRef = useCallback(
    (key: string): RefCallback<HTMLButtonElement> =>
      (element) => {
        if (element === null) elementsRef.current.delete(key);
        else elementsRef.current.set(key, element);
      },
    [],
  );

  /** gesture listener, frame과 capture를 한 번에 제거한다. */
  const detachGesture = useCallback((gesture: DragGesture): void => {
    if (gesture.animationFrame !== null) cancelAnimationFrame(gesture.animationFrame);
    gesture.animationFrame = null;
    gesture.pendingPointer = null;
    window.removeEventListener("pointermove", gesture.listeners.pointerMove);
    window.removeEventListener("pointerup", gesture.listeners.pointerUp);
    window.removeEventListener("pointercancel", gesture.listeners.pointerCancel);
    window.removeEventListener("keydown", gesture.listeners.keyDown);
    gesture.owner.removeEventListener("lostpointercapture", gesture.listeners.lostPointerCapture);
    if (gestureRef.current === gesture) gestureRef.current = null;
    releasePointerCapture(gesture.owner, gesture.pointerId);
  }, []);

  /** 최신 pointer sample을 한 animation frame에 한 번 drag transform으로 반영한다. */
  const flushPointer = useCallback((gesture: DragGesture): void => {
    const pointer = gesture.pendingPointer;
    gesture.pendingPointer = null;
    gesture.animationFrame = null;
    if (pointer === null || gestureRef.current !== gesture) return;
    gesture.lastPointer = pointer;
    const x = pointer.x - gesture.startPointer.x;
    const y = pointer.y - gesture.startPointer.y;
    if (!gesture.active && Math.hypot(x, y) >= MOVE_ACTIVATION_DISTANCE) {
      gesture.active = true;
      suppressClickRef.current = true;
      setIsDragging(true);
    }
    if (gesture.active) setDragVisual({ key: gesture.key, x, y });
  }, []);

  /** 완료되거나 취소된 pointer gesture의 visual state를 정리한다. */
  const clearGestureVisual = useCallback((): void => {
    if (!mountedRef.current) return;
    setDragVisual(null);
    setIsDragging(false);
  }, []);

  /** 실제 순서 변경 Action을 시작하고 첫 측정 phase를 완료한다. */
  const startReorder = useCallback(
    (
      gesture: DragGesture,
      item: StartPinnedItemViewModel,
      destination: number,
    ): void => {
      const handle = actions.execute({
        type: "reorder",
        resource: item.resource,
        intent: { type: "index", index: destination },
      });
      const pending: PendingReorder = {
        beforeRects: gesture.beforeRects,
        cleanupMove: null,
        handle,
        phase: "start-reorder-measure-before",
        signalFrame: null,
      };
      pendingReorderRef.current = pending;
      const signalMeasurement = (): void => {
        if (pendingReorderRef.current !== pending) return;
        if (actions.completeTransition(handle.operationId, pending.phase)) {
          pending.signalFrame = null;
          pending.phase = "start-reorder-measure-after";
        } else {
          pending.signalFrame = requestAnimationFrame(signalMeasurement);
        }
      };
      queueMicrotask(signalMeasurement);
      void handle.committed.then((result) => {
        if (pendingReorderRef.current !== pending || result.status === "committed") return;
        if (pending.signalFrame !== null) cancelAnimationFrame(pending.signalFrame);
        pendingReorderRef.current = null;
      });
    },
    [actions],
  );

  /** pointer move를 rAF로 합치고 drag activation threshold를 적용한다. */
  function handlePointerMove(event: PointerEvent): void {
    const gesture = gestureRef.current;
    if (gesture === null || gesture.pointerId !== event.pointerId) return;
    gesture.pendingPointer = { x: event.clientX, y: event.clientY };
    if (gesture.animationFrame !== null) return;
    gesture.animationFrame = requestAnimationFrame(() => flushPointer(gesture));
  }

  /** 마지막 위치에서 destination을 계산하고 semantic reorder를 시작한다. */
  function handlePointerUp(event: PointerEvent): void {
    const gesture = gestureRef.current;
    if (gesture === null || gesture.pointerId !== event.pointerId) return;
    if (gesture.animationFrame !== null) cancelAnimationFrame(gesture.animationFrame);
    gesture.animationFrame = null;
    const pointer = { x: event.clientX, y: event.clientY };
    const active =
      gesture.active ||
      Math.hypot(pointer.x - gesture.startPointer.x, pointer.y - gesture.startPointer.y) >=
        MOVE_ACTIVATION_DISTANCE;
    detachGesture(gesture);
    clearGestureVisual();
    if (!active) return;
    suppressClickRef.current = true;
    const currentItems = itemsRef.current;
    const destination = destinationIndex(pointer, currentItems, gesture.beforeRects);
    if (destination !== gesture.itemIndex) {
      const item = currentItems.find((candidate) => itemKey(candidate) === gesture.key);
      if (item !== undefined) startReorder(gesture, item, destination);
    }
  }

  /** pointercancel과 capture 상실은 Action 없이 gesture 자원을 정리한다. */
  function cancelGesture(event: PointerEvent): void {
    const gesture = gestureRef.current;
    if (gesture === null || gesture.pointerId !== event.pointerId) return;
    detachGesture(gesture);
    suppressClickRef.current = false;
    clearGestureVisual();
  }

  /** Escape는 진행 중 pointer reorder 후보를 취소한다. */
  function handleKeyDown(event: KeyboardEvent): void {
    const gesture = gestureRef.current;
    if (event.key !== "Escape" || gesture === null) return;
    event.preventDefault();
    detachGesture(gesture);
    suppressClickRef.current = false;
    clearGestureVisual();
  }

  const handlePointerDown = useCallback(
    (
      event: ReactPointerEvent<HTMLButtonElement>,
      item: StartPinnedItemViewModel,
      index: number,
    ): void => {
      if (
        event.button !== 0 ||
        event.isPrimary === false ||
        gestureRef.current !== null ||
        pendingReorderRef.current !== null
      )
        return;
      const owner = event.currentTarget;
      const listeners = Object.freeze({
        keyDown: handleKeyDown,
        lostPointerCapture: cancelGesture,
        pointerCancel: cancelGesture,
        pointerMove: handlePointerMove,
        pointerUp: handlePointerUp,
      });
      const gesture: DragGesture = {
        active: false,
        animationFrame: null,
        beforeRects: measureItems(itemsRef.current, elementsRef.current),
        itemIndex: index,
        key: itemKey(item),
        lastPointer: { x: event.clientX, y: event.clientY },
        listeners,
        owner,
        pendingPointer: null,
        pointerId: event.pointerId,
        startPointer: { x: event.clientX, y: event.clientY },
      };
      gestureRef.current = gesture;
      try {
        owner.setPointerCapture?.(event.pointerId);
      } catch {
        gestureRef.current = null;
        return;
      }
      owner.addEventListener("lostpointercapture", listeners.lostPointerCapture);
      window.addEventListener("pointermove", listeners.pointerMove);
      window.addEventListener("pointerup", listeners.pointerUp);
      window.addEventListener("pointercancel", listeners.pointerCancel);
      window.addEventListener("keydown", listeners.keyDown);
    },
    [],
  );

  /** committed render 뒤 새 rect를 측정하고 모든 이동 tile에 FLIP transition을 적용한다. */
  useLayoutEffect(() => {
    const pending = pendingReorderRef.current;
    if (pending === null || pending.phase !== "start-reorder-measure-after") return undefined;
    const afterRects = measureItems(items, elementsRef.current);
    if (!actions.completeTransition(pending.handle.operationId, pending.phase)) return undefined;
    pending.phase = "start-reorder-move";

    const moving = items.flatMap((item) => {
      const key = itemKey(item);
      const element = elementsRef.current.get(key);
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
    const cleanStyles = (): void => {
      moving.forEach(({ element }) => {
        element.style.removeProperty("transition");
        element.style.removeProperty("transform");
        element.style.removeProperty("will-change");
      });
    };
    const finish = (): void => {
      if (settled) return;
      settled = true;
      if (frame !== null) cancelAnimationFrame(frame);
      if (timeout !== null) clearTimeout(timeout);
      moving.forEach(({ element }) => element.removeEventListener("transitionend", onTransitionEnd));
      cleanStyles();
      if (pendingReorderRef.current === pending) pendingReorderRef.current = null;
      actions.completeTransition(pending.handle.operationId, pending.phase);
    };
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
    void elementsRef.current.values().next().value?.offsetWidth;
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
      moving.forEach(({ element }) => element.removeEventListener("transitionend", onTransitionEnd));
      cleanStyles();
    };

    return undefined;
  }, [actions, items]);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      const gesture = gestureRef.current;
      if (gesture !== null) detachGesture(gesture);
      const pending = pendingReorderRef.current;
      if (pending === null) return;
      if (pending.signalFrame !== null) cancelAnimationFrame(pending.signalFrame);
      pending.cleanupMove?.();
      actions.abortTransition(
        pending.handle.operationId,
        pending.phase,
        "start-pinned-component-unmounted",
      );
      pendingReorderRef.current = null;
    };
  }, [actions, detachGesture]);

  const consumeClickSuppression = useCallback((): boolean => {
    const suppressed = suppressClickRef.current;
    suppressClickRef.current = false;
    return suppressed;
  }, []);

  return { consumeClickSuppression, dragVisual, getItemRef, handlePointerDown, isDragging };
};
