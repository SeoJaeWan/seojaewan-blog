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
} from "../../../../../../../headless/windows/index.js";

/**
 * Taskbar application icon에서 측정한 viewport px destination이다.
 *
 * 제품 root가 DOM에서 측정해 전달하며 Common Window는 Taskbar Store나 DOM을 직접 조회하지 않는다.
 */
type WindowMotionDestination = Readonly<{
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
  animationFrame: number | null;
  request: WindowPresentationRequest;
  settled: boolean;
};

const ENTER_DURATION = 200;
const EXIT_DURATION = 150;
const ENTER_EASING = "cubic-bezier(0.2, 0.75, 0.25, 1)";
const EXIT_EASING = "cubic-bezier(0.4, 0, 0.6, 1)";
const NEUTRAL_EASING = "cubic-bezier(0.4, 0, 0.2, 1)";

/**
 * React object ref와 callback ref에 현재 frame element를 전달한다.
 *
 * ref가 생략됐거나 `null`이면 부수 효과 없이 반환한다.
 */
const assignRef = <Value>(ref: Ref<Value> | undefined, value: Value | null): void => {
  if (typeof ref === "function") {
    ref(value);
    return;
  }
  if (ref !== null && ref !== undefined) ref.current = value;
};

/**
 * 현재 환경에서 reduced motion 사용자가 animation 대기를 원하지 않는지 확인한다.
 *
 * SSR 또는 `matchMedia`가 없는 환경은 일반 motion 경로를 사용하도록 `false`를 반환한다.
 */
const prefersReducedMotion = (): boolean =>
  typeof window !== "undefined" &&
  typeof window.matchMedia === "function" &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/**
 * 한 rect를 다른 rect에 맞추는 top-left 기준 translate·scale transform을 만든다.
 *
 * 입력은 viewport px 좌표이며 DOM을 읽거나 animation 상태를 변경하지 않는다.
 */
const transformBetweenRects = (from: DOMRect, to: WindowMotionDestination | DOMRect): string => {
  const scaleX = to.width / from.width;
  const scaleY = to.height / from.height;
  return `translate(${to.left - from.left}px, ${to.top - from.top}px) scale(${scaleX}, ${scaleY})`;
};

/**
 * 현재 phase와 실제 layout 측정값으로 실행할 keyframe·timing을 계산한다.
 *
 * 최소화·복원에는 Taskbar destination이 필요하며 지원하지 않는 phase도 명시적 오류로 거절한다.
 */
const createMotion = (
  phase: string,
  current: DOMRect,
  previous: DOMRect | null,
  destination: WindowMotionDestination | null,
): Readonly<{ keyframes: Keyframe[]; options: KeyframeAnimationOptions }> => {
  const identity: Keyframe = { opacity: 1, transform: "none", transformOrigin: "top left" };
  if (phase === "window-enter") {
    return {
      keyframes: [{ opacity: 0, transform: "scale(0.6)", transformOrigin: "top left" }, identity],
      options: { duration: ENTER_DURATION, easing: ENTER_EASING, fill: "both" },
    };
  }
  if (phase === "window-exit") {
    const centeredIdentity: Keyframe = {
      opacity: 1,
      transform: "none",
      transformOrigin: "center",
    };
    return {
      keyframes: [
        centeredIdentity,
        { opacity: 0, transform: "scale(0.6)", transformOrigin: "center" },
      ],
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

/**
 * element가 현재 Window 안에서 focus 복원을 시도할 수 있는 대상인지 확인한다.
 *
 * 제거됐거나 control·hidden·inert·disabled subtree에 속한 대상은 복원 후보에서 제외한다.
 */
const isRestorableFocusTarget = (element: HTMLElement, frame: HTMLElement): boolean =>
  element.isConnected &&
  frame.contains(element) &&
  !element.closest(".window-controls, [hidden], [inert], [aria-hidden='true']") &&
  !element.matches(":disabled");

/**
 * 기억한 element로 focus를 복원하고 browser가 수락하지 않으면 Window frame으로 대체한다.
 *
 * CSS나 runtime 상태로 focus를 받을 수 없는 대상은 `focus()` 호출 뒤 active element 확인으로 판정한다.
 */
const restoreFrameFocus = (remembered: HTMLElement | null, frame: HTMLElement): void => {
  if (remembered !== null && isRestorableFocusTarget(remembered, frame)) {
    remembered.focus({ preventScroll: true });
    if (frame.ownerDocument.activeElement === remembered) return;
  }
  frame.focus({ preventScroll: true });
};

/**
 * 현재 frame 안에 남은 browser focus를 body로 반환한다.
 *
 * 다른 제품 element를 선택하지 않으며 frame 밖의 focus에는 영향을 주지 않는다.
 */
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
  const destinationRef = useRef(destination);
  destinationRef.current = destination;

  /**
   * 내부 ref와 caller가 전달한 ref에 같은 element identity를 쓴다.
   *
   * React가 root를 교체하거나 해제할 때 `null`도 두 ref에 동일하게 전달한다.
   */
  const frameRef = useCallback<RefCallback<HTMLElement>>(
    (element) => {
      frameElementRef.current = element;
      assignRef(forwardedRef, element);
    },
    [forwardedRef],
  );

  /**
   * control focus를 제외한 마지막 Window 내부 focus를 복원 후보로 기억한다.
   *
   * Window 밖이나 숨겨진 subtree의 focus event는 기존 이력을 덮어쓰지 않는다.
   */
  const rememberFocus = useCallback((event: FocusEvent<HTMLElement>) => {
    const frame = frameElementRef.current;
    const target = event.target;
    if (frame !== null && target instanceof HTMLElement && isRestorableFocusTarget(target, frame))
      rememberedFocusRef.current = target;
  }, []);

  /**
   * gesture pointer가 authoritative bounds를 즉시 추종하도록 현재 visual transform과 wait를 중단한다.
   *
   * semantic frame rollback은 수행하지 않고 exact presentation transition만 abort한다.
   */
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
      animationFrame: null,
      request: presentation,
      settled: false,
    };
    activePresentationRef.current = activePresentation;

    /**
     * 이 effect가 소유한 요청을 실제 animation 완료로 한 번만 종료한다.
     *
     * 중복·늦은 완료는 `settled` guard로 무시하고 exact operation ID와 phase만 보고한다.
     */
    const complete = (): void => {
      if (activePresentation.settled) return;
      activePresentation.settled = true;
      actions.completeTransition(presentation.operationId, presentation.phase);
    };

    if (prefersReducedMotion()) {
      complete();
      return undefined;
    }

    /**
     * 최신 layout을 한 번 측정해 exact presentation의 WAAPI handle을 시작한다.
     *
     * 시작 뒤 destination prop 변경은 이 handle을 교체하지 않으며 실패는 exact transition에 보고한다.
     */
    const startMotion = (): void => {
      if (activePresentation.settled) return;
      activePresentation.animationFrame = null;
      try {
        if (typeof frame.animate !== "function")
          throw new Error("현재 환경에서 Window Web Animation API를 사용할 수 없습니다");
        const motion = createMotion(
          presentation.phase,
          frame.getBoundingClientRect(),
          previousBoundsRef.current,
          destinationRef.current,
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
    };

    if (presentation.phase === "window-minimize" || presentation.phase === "window-restore") {
      activePresentation.animationFrame = requestAnimationFrame(startMotion);
    } else {
      startMotion();
    }

    return () => {
      if (activePresentationRef.current === activePresentation)
        activePresentationRef.current = null;
      if (activePresentation.animationFrame !== null)
        cancelAnimationFrame(activePresentation.animationFrame);
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
  }, [actions, presentation]);

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
      restoreFrameFocus(rememberedFocusRef.current, frame);
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
