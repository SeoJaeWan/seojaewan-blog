/**
 * @file Common Window의 pointer capture, rAF sampling과 Esc 종료를 관리한다.
 *
 * frame 상태와 rollback 순서는 headless gesture Handle이 소유하며 이 hook은 DOM event와 숫자 bounds만 연결한다.
 */
import {
  type PointerEvent as ReactPointerEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

import type {
  WindowControllerActions,
  WindowGestureHandle,
  WindowPlacementConfig,
  WindowRect,
  WindowResizeDirection,
  WindowSessionId,
} from "../../../../../../../headless/windows/index.js";
import { calculateWindowGestureBounds } from "../../utils/windowGestureBounds/index.js";

type GestureOwner = HTMLElement & {
  hasPointerCapture?(pointerId: number): boolean;
  releasePointerCapture?(pointerId: number): void;
  setPointerCapture?(pointerId: number): void;
};

type WindowPointerGesture = {
  handle: WindowGestureHandle | null;
  kind: "move" | "resize";
  owner: GestureOwner;
  pointerId: number;
  startPointer: Readonly<{ x: number; y: number }>;
  lastPointer: Readonly<{ x: number; y: number }>;
  resizeDirection: WindowResizeDirection | null;
  pendingPointer: Readonly<{ x: number; y: number }> | null;
  animationFrame: number | null;
  placementConfig: WindowPlacementConfig;
  workArea: WindowRect;
  listeners: Readonly<{
    keyDown: (event: KeyboardEvent) => void;
    lostPointerCapture: (event: PointerEvent) => void;
    pointerCancel: (event: PointerEvent) => void;
    pointerMove: (event: PointerEvent) => void;
    pointerUp: (event: PointerEvent) => void;
  }>;
};

/** 클릭의 미세한 좌표 흔들림을 Window 이동으로 바꾸지 않는 최소 거리다. */
const MOVE_ACTIVATION_DISTANCE = 4;

/** pointer event에서 rAF가 사용할 viewport 좌표만 복사한다. */
const readPointerPosition = (event: PointerEvent): Readonly<{ x: number; y: number }> =>
  Object.freeze({ x: event.clientX, y: event.clientY });

/** 현재 element가 보유한 pointer capture를 예외 없이 반환한다. */
const hasPointerCapture = (owner: GestureOwner, pointerId: number): boolean =>
  owner.hasPointerCapture?.(pointerId) ?? false;

/** browser가 허용하는 경우 정확한 pointer capture를 해제한다. */
const releasePointerCapture = (owner: GestureOwner, pointerId: number): void => {
  if (hasPointerCapture(owner, pointerId)) owner.releasePointerCapture?.(pointerId);
};

/** 현재 animation frame과 아직 전달하지 않은 pointer sample을 버린다. */
const discardPendingPointer = (gesture: WindowPointerGesture): void => {
  if (gesture.animationFrame !== null) cancelAnimationFrame(gesture.animationFrame);
  gesture.animationFrame = null;
  gesture.pendingPointer = null;
};

/** Common Window root가 pointer 기반 move·resize를 시작할 진입점과 active 표현을 제공한다. */
export type WindowPointerGestureController = Readonly<{
  /** move·resize update 또는 rollback이 끝날 때까지 bounds transition을 끈다. */
  active: boolean;
  /** 빈 titlebar pointer 입력으로 move를 시작한다. */
  startMove(event: ReactPointerEvent<HTMLDivElement>): boolean;
  /** 방향 handle pointer 입력으로 resize를 시작한다. */
  startResize(
    event: ReactPointerEvent<HTMLButtonElement>,
    direction: WindowResizeDirection,
  ): boolean;
}>;

/**
 * controller gesture Handle에 pointer capture·rAF sampling·Esc rollback을 연결한다.
 *
 * pointer capture 상실과 unmount는 rollback으로 확대하지 않고 접수된 update만 안전하게 종료한다.
 */
export const useWindowPointerGesture = (
  actions: WindowControllerActions,
  sessionId: WindowSessionId,
  workArea: WindowRect | null,
  placementConfig: WindowPlacementConfig,
  onGestureActivated?: () => void,
): WindowPointerGestureController => {
  const gestureRef = useRef<WindowPointerGesture | null>(null);
  const mountedRef = useRef(true);
  const [active, setActive] = useState(false);

  /** DOM listener와 capture를 제거하고 현재 gesture ref를 비운다. */
  const detachGesture = useCallback((gesture: WindowPointerGesture) => {
    discardPendingPointer(gesture);
    window.removeEventListener("pointermove", gesture.listeners.pointerMove);
    window.removeEventListener("pointerup", gesture.listeners.pointerUp);
    window.removeEventListener("pointercancel", gesture.listeners.pointerCancel);
    gesture.owner.removeEventListener("lostpointercapture", gesture.listeners.lostPointerCapture);
    if (gesture.handle !== null) window.removeEventListener("keydown", gesture.listeners.keyDown);
    if (gestureRef.current === gesture) gestureRef.current = null;
    releasePointerCapture(gesture.owner, gesture.pointerId);
  }, []);

  /** 이동 임계값을 넘거나 resize가 시작되면 headless Handle과 pointer capture를 연결한다. */
  const activateGesture = useCallback(
    (gesture: WindowPointerGesture): boolean => {
      if (gesture.handle !== null) return true;
      const started = actions.beginGesture({ kind: gesture.kind, sessionId });
      if (started.status !== "started") {
        detachGesture(gesture);
        return false;
      }
      gesture.handle = started.handle;
      gesture.owner.setPointerCapture?.(gesture.pointerId);
      gesture.owner.addEventListener("lostpointercapture", gesture.listeners.lostPointerCapture);
      window.addEventListener("keydown", gesture.listeners.keyDown);
      setActive(true);
      onGestureActivated?.();
      return true;
    },
    [actions, detachGesture, onGestureActivated, sessionId],
  );

  /** 종료 Promise 뒤 mounted root의 transition 상태를 되돌린다. */
  const finishVisualState = useCallback(async (completion: Promise<unknown>) => {
    try {
      await completion;
    } finally {
      if (mountedRef.current) setActive(false);
    }
  }, []);

  /** 마지막 pointer sample을 headless Handle에 numeric bounds로 전달한다. */
  const flushPointer = useCallback((gesture: WindowPointerGesture) => {
    const pointer = gesture.pendingPointer;
    gesture.pendingPointer = null;
    gesture.animationFrame = null;
    if (pointer === null || gestureRef.current !== gesture || gesture.handle === null) return;
    gesture.lastPointer = pointer;
    void gesture.handle.update(calculateWindowGestureBounds(gesture, pointer));
  }, []);

  /** 같은 pointer의 최신 위치만 보관하고 한 animation frame에 한 번 update한다. */
  function handlePointerMove(event: PointerEvent): void {
    const gesture = gestureRef.current;
    if (gesture === null || event.pointerId !== gesture.pointerId) return;
    const pointer = readPointerPosition(event);
    if (gesture.handle === null) {
      const distance = Math.hypot(
        pointer.x - gesture.startPointer.x,
        pointer.y - gesture.startPointer.y,
      );
      if (distance < MOVE_ACTIVATION_DISTANCE) return;
      if (!activateGesture(gesture)) return;
      event.preventDefault();
    }
    gesture.pendingPointer = pointer;
    if (gesture.animationFrame !== null) return;
    gesture.animationFrame = requestAnimationFrame(() => flushPointer(gesture));
  }

  /** pointerup의 마지막 sample까지 접수한 뒤 rollback 없이 gesture를 끝낸다. */
  function handlePointerUp(event: PointerEvent): void {
    const gesture = gestureRef.current;
    if (gesture === null || event.pointerId !== gesture.pointerId) return;
    if (gesture.handle === null) {
      detachGesture(gesture);
      return;
    }
    if (gesture.animationFrame !== null) cancelAnimationFrame(gesture.animationFrame);
    gesture.animationFrame = null;
    const pointer = readPointerPosition(event);
    if (
      gesture.pendingPointer !== null ||
      pointer.x !== gesture.lastPointer.x ||
      pointer.y !== gesture.lastPointer.y
    ) {
      gesture.pendingPointer = pointer;
    }
    flushPointer(gesture);
    detachGesture(gesture);
    void finishVisualState(gesture.handle.finish());
  }

  /** browser pointercancel은 semantic rollback으로 바꾸지 않고 현재 update queue만 끝낸다. */
  function handlePointerCancel(event: PointerEvent): void {
    const gesture = gestureRef.current;
    if (gesture === null || event.pointerId !== gesture.pointerId) return;
    detachGesture(gesture);
    if (gesture.handle !== null) void finishVisualState(gesture.handle.finish());
  }

  /** 예상하지 못한 capture 상실에서도 listener와 rAF를 제거하고 gesture를 일반 종료한다. */
  function handleLostPointerCapture(event: PointerEvent): void {
    const gesture = gestureRef.current;
    if (gesture === null || event.pointerId !== gesture.pointerId) return;
    detachGesture(gesture);
    if (gesture.handle !== null) void finishVisualState(gesture.handle.finish());
  }

  /** Escape는 남은 sample을 버리고 headless 시작 frame rollback을 정확히 한 번 요청한다. */
  function handleKeyDown(event: KeyboardEvent): void {
    if (event.key !== "Escape" || gestureRef.current === null) return;
    event.preventDefault();
    const gesture = gestureRef.current;
    detachGesture(gesture);
    if (gesture.handle !== null) void finishVisualState(gesture.handle.cancel());
  }

  /** primary pointer의 이동 후보를 만들고 resize는 즉시, move는 거리 임계값 뒤 활성화한다. */
  const startGesture = useCallback(
    (
      event: ReactPointerEvent<HTMLElement>,
      kind: "move" | "resize",
      resizeDirection: WindowResizeDirection | null,
    ) => {
      if (
        event.button !== 0 ||
        event.isPrimary === false ||
        gestureRef.current !== null ||
        workArea === null
      )
        return false;
      event.preventDefault();
      const owner = event.currentTarget;
      const listeners = Object.freeze({
        keyDown: handleKeyDown,
        lostPointerCapture: handleLostPointerCapture,
        pointerCancel: handlePointerCancel,
        pointerMove: handlePointerMove,
        pointerUp: handlePointerUp,
      });
      const gesture: WindowPointerGesture = {
        handle: null,
        kind,
        owner,
        pointerId: event.pointerId,
        startPointer: Object.freeze({ x: event.clientX, y: event.clientY }),
        lastPointer: Object.freeze({ x: event.clientX, y: event.clientY }),
        resizeDirection,
        pendingPointer: null,
        animationFrame: null,
        placementConfig,
        workArea,
        listeners,
      };
      gestureRef.current = gesture;
      window.addEventListener("pointermove", listeners.pointerMove);
      window.addEventListener("pointerup", listeners.pointerUp);
      window.addEventListener("pointercancel", listeners.pointerCancel);
      if (kind === "resize") return activateGesture(gesture);
      return true;
    },
    [activateGesture, placementConfig, workArea],
  );

  /** 빈 titlebar의 primary pointer로 move gesture를 시작한다. */
  const startMove = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => startGesture(event, "move", null),
    [startGesture],
  );

  /** 정확한 edge 또는 corner 방향의 primary pointer로 resize gesture를 시작한다. */
  const startResize = useCallback(
    (event: ReactPointerEvent<HTMLButtonElement>, direction: WindowResizeDirection) =>
      startGesture(event, "resize", direction),
    [startGesture],
  );

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      const gesture = gestureRef.current;
      if (gesture === null) return;
      detachGesture(gesture);
      if (gesture.handle !== null) void gesture.handle.finish();
    };
  }, [detachGesture, sessionId]);

  return { active, startMove, startResize };
};
