/**
 * @file Common Window의 실제 animation 완료와 DOM focus 수명주기를 headless Operation에 연결한다.
 *
 * semantic commit과 queue는 headless가 소유하며 이 hook은 현재 root의 WAAPI handle, focus 이력과 정리만 소유한다.
 */
import {
  type FocusEvent,
  type Ref,
  type RefCallback,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
} from "react";

import type {
  WindowControllerActions,
  WindowPresentationRequest,
} from "../../../../headless/windows/index.js";

/** Taskbar application icon에서 측정한 viewport px destination이다. */
export type WindowMotionDestination = Readonly<{
  /** icon border box의 viewport 왼쪽 위치다. */
  left: number;
  /** icon border box의 viewport 위쪽 위치다. */
  top: number;
  /** icon border box의 px 너비다. */
  width: number;
  /** icon border box의 px 높이다. */
  height: number;
}>;

type WindowPresentationLifecycleOptions = Readonly<{
  actions: WindowControllerActions;
  active: boolean;
  destination: WindowMotionDestination | null;
  minimized: boolean;
  presentation: WindowPresentationRequest | null;
}>;

type WindowPresentationLifecycle = Readonly<{
  /** caller ref와 내부 animation·focus ref를 함께 연결한다. */
  frameRef: RefCallback<HTMLElement>;
  /** 최소화 control이 기존 content focus 이력을 덮지 않게 focus 진입을 기록한다. */
  rememberFocus(event: FocusEvent<HTMLElement>): void;
  /** pointer gesture가 시작되면 진행 중인 bounds animation 대기만 중단한다. */
  interruptForGesture(): void;
}>;

type ActivePresentation = {
  animation: Animation | null;
  request: WindowPresentationRequest;
  settled: boolean;
};

const ENTER_DURATION = 200;
const EXIT_DURATION = 150;
const ENTER_EASING = "cubic-bezier(0.2, 0.75, 0.25, 1)";
const EXIT_EASING = "cubic-bezier(0.4, 0, 0.6, 1)";
const NEUTRAL_EASING = "cubic-bezier(0.4, 0, 0.2, 1)";

/** React object/callback ref에 현재 frame element를 전달한다. */
const assignRef = <Value,>(ref: Ref<Value> | undefined, value: Value | null): void => {
  if (typeof ref === "function") {
    ref(value);
    return;
  }
  if (ref !== null && ref !== undefined) ref.current = value;
};

/** 현재 환경에서 reduced motion 사용자가 animation 대기를 원하지 않는지 확인한다. */
const prefersReducedMotion = (): boolean =>
  typeof window !== "undefined" &&
  typeof window.matchMedia === "function" &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/** 한 rect를 다른 rect에 맞추는 top-left 기준 translate·scale transform을 만든다. */
const transformBetweenRects = (from: DOMRect, to: WindowMotionDestination | DOMRect): string => {
  const scaleX = to.width / from.width;
  const scaleY = to.height / from.height;
  return `translate(${to.left - from.left}px, ${to.top - from.top}px) scale(${scaleX}, ${scaleY})`;
};

/** 현재 phase와 실제 layout 측정값으로 실행할 keyframe·timing을 계산한다. */
const createMotion = (
  phase: string,
  current: DOMRect,
  previous: DOMRect | null,
  destination: WindowMotionDestination | null,
): Readonly<{ keyframes: Keyframe[]; options: KeyframeAnimationOptions }> => {
  const identity: Keyframe = { opacity: 1, transform: "none", transformOrigin: "top left" };
  if (phase === "window-enter") {
    return {
      keyframes: [
        { opacity: 0, transform: "scale(0.6)", transformOrigin: "top left" },
        identity,
      ],
      options: { duration: ENTER_DURATION, easing: ENTER_EASING, fill: "both" },
    };
  }
  if (phase === "window-exit") {
    return {
      keyframes: [identity, { opacity: 0, transform: "scale(0.6)", transformOrigin: "top left" }],
      options: { duration: EXIT_DURATION, easing: EXIT_EASING, fill: "both" },
    };
  }
  if (phase === "window-minimize" || phase === "window-restore") {
    if (destination === null)
      throw new Error("최소화·복원 animation에는 측정한 Taskbar icon destination이 필요합니다");
    const atTaskbar: Keyframe = {
      opacity: 0,
      transform: transformBetweenRects(current, destination),
      transformOrigin: "top left",
    };
    return {
      keyframes: phase === "window-minimize" ? [identity, atTaskbar] : [atTaskbar, identity],
      options: {
        duration: phase === "window-minimize" ? EXIT_DURATION : ENTER_DURATION,
        easing: phase === "window-minimize" ? EXIT_EASING : ENTER_EASING,
        fill: "both",
      },
    };
  }
  if (phase === "window-maximize" || phase === "window-restore-normal-bounds") {
    const from = previous ?? current;
    return {
      keyframes: [
        {
          opacity: 1,
          transform: transformBetweenRects(current, from),
          transformOrigin: "top left",
        },
        identity,
      ],
      options: { duration: EXIT_DURATION, easing: NEUTRAL_EASING, fill: "both" },
    };
  }
  throw new Error(`지원하지 않는 Window presentation phase입니다: ${phase}`);
};

/** element가 복원 가능한 현재 Window 내부 focus 대상인지 확인한다. */
const isRestorableFocusTarget = (element: HTMLElement, frame: HTMLElement): boolean =>
  element.isConnected && frame.contains(element) && !element.closest(".window-controls");

/** 현재 frame 안에 남은 browser focus를 body로 반환해 다른 제품 요소로 옮기지 않는다. */
const releaseFrameFocus = (frame: HTMLElement): void => {
  const focused = frame.ownerDocument.activeElement;
  if (focused instanceof HTMLElement && frame.contains(focused)) focused.blur();
};

/**
 * Common Window의 WAAPI completion과 최소화·복원 focus 규칙을 연결한다.
 *
 * 정상 motion은 `Animation.finished` 뒤에만 완료하고 unmount·요청 교체는 abort로 정리한다.
 */
export const useWindowPresentation = (
  forwardedRef: Ref<HTMLElement> | undefined,
  options: WindowPresentationLifecycleOptions,
): WindowPresentationLifecycle => {
  const { actions, active, destination, minimized, presentation } = options;
  const frameElementRef = useRef<HTMLElement | null>(null);
  const previousBoundsRef = useRef<DOMRect | null>(null);
  const previousActiveRef = useRef(active);
  const previousMinimizedRef = useRef(minimized);
  const rememberedFocusRef = useRef<HTMLElement | null>(null);
  const activePresentationRef = useRef<ActivePresentation | null>(null);

  /** 내부 ref와 caller가 전달한 ref에 같은 element identity를 쓴다. */
  const frameRef = useCallback<RefCallback<HTMLElement>>(
    (element) => {
      frameElementRef.current = element;
      assignRef(forwardedRef, element);
    },
    [forwardedRef],
  );

  /** control focus를 제외한 마지막 Window 내부 focus를 복원 후보로 기억한다. */
  const rememberFocus = useCallback((event: FocusEvent<HTMLElement>) => {
    const frame = frameElementRef.current;
    const target = event.target;
    if (frame !== null && target instanceof HTMLElement && isRestorableFocusTarget(target, frame))
      rememberedFocusRef.current = target;
  }, []);

  /** gesture pointer가 authoritative bounds를 즉시 추종하도록 현재 visual transform과 wait만 중단한다. */
  const interruptForGesture = useCallback(() => {
    const activePresentation = activePresentationRef.current;
    if (activePresentation === null || activePresentation.settled) return;
    activePresentation.settled = true;
    activePresentation.animation?.cancel();
    actions.abortTransition(
      activePresentation.request.operationId,
      activePresentation.request.phase,
      "window-presentation-interrupted-by-gesture",
    );
  }, [actions]);

  useLayoutEffect(() => {
    const frame = frameElementRef.current;
    if (frame === null || presentation === null) return undefined;
    const activePresentation: ActivePresentation = {
      animation: null,
      request: presentation,
      settled: false,
    };
    activePresentationRef.current = activePresentation;

    /** 이 effect가 소유한 요청을 실제 animation 완료로 한 번만 종료한다. */
    const complete = (): void => {
      if (activePresentation.settled) return;
      activePresentation.settled = true;
      actions.completeTransition(presentation.operationId, presentation.phase);
    };

    if (prefersReducedMotion()) {
      complete();
      return undefined;
    }

    try {
      if (typeof frame.animate !== "function")
        throw new Error("현재 환경에서 Window Web Animation API를 사용할 수 없습니다");
      const motion = createMotion(
        presentation.phase,
        frame.getBoundingClientRect(),
        previousBoundsRef.current,
        destination,
      );
      activePresentation.animation = frame.animate(motion.keyframes, motion.options);
      void activePresentation.animation.finished.then(complete).catch((error: unknown) => {
        if (activePresentation.settled) return;
        activePresentation.settled = true;
        actions.failTransition(presentation.operationId, presentation.phase, error);
      });
    } catch (error) {
      activePresentation.settled = true;
      actions.failTransition(presentation.operationId, presentation.phase, error);
    }

    return () => {
      if (activePresentationRef.current === activePresentation)
        activePresentationRef.current = null;
      activePresentation.animation?.cancel();
      if (!activePresentation.settled) {
        activePresentation.settled = true;
        actions.abortTransition(
          presentation.operationId,
          presentation.phase,
          "window-component-unmounted-or-presentation-replaced",
        );
      }
    };
  }, [actions, destination, presentation]);

  useLayoutEffect(() => {
    const frame = frameElementRef.current;
    if (frame !== null && !minimized) previousBoundsRef.current = frame.getBoundingClientRect();
  });

  useEffect(() => {
    const frame = frameElementRef.current;
    if (frame === null) return;
    const becameActive = active && !previousActiveRef.current;
    const restored = !minimized && previousMinimizedRef.current;
    if (becameActive || restored) {
      const remembered = rememberedFocusRef.current;
      if (remembered !== null && isRestorableFocusTarget(remembered, frame)) remembered.focus();
      else frame.focus();
    } else if (minimized && !previousMinimizedRef.current) {
      releaseFrameFocus(frame);
    }
    previousActiveRef.current = active;
    previousMinimizedRef.current = minimized;
  }, [active, minimized]);

  useEffect(
    () => () => {
      const frame = frameElementRef.current;
      if (frame !== null) releaseFrameFocus(frame);
    },
    [],
  );

  return { frameRef, interruptForGesture, rememberFocus };
};
