/**
 * @file headless Window controller snapshot과 Common Window controlled parts를 연결한다.
 *
 * Application이 제공하는 titlebar/content slot은 그대로 유지하고 제품 상태 계산은 WindowStore에 남긴다.
 */
import {
  type FocusEvent,
  type PointerEvent,
  type ReactNode,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

import {
  getWindowBounds,
  useWindowController,
  type WindowAction,
  type WindowPlacementConfig,
  type WindowPresentationRequest,
  type WindowSessionId,
} from "../../../../../headless/windows/index.js";
import { WindowControls } from "../controls/index.js";
import { WindowFrame, type WindowFrameProps } from "../frame/index.js";
import { WindowTitleBar } from "../titleBar/index.js";
import {
  type WindowPresentationBinding,
  type WindowPresentationConsumer,
} from "../utils/presentationBinding/index.js";
import { useWindowPointerGesture } from "./hooks/useWindowPointerGesture/index.js";
import { useWindowPresentation } from "./hooks/useWindowPresentation/index.js";

/**
 * Taskbar application icon에서 측정한 viewport px destination이다.
 *
 * 외부 앱이 DOM에서 측정해 전달하며 Common Window는 Taskbar Store나 DOM을 직접 조회하지 않는다.
 */
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

/**
 * controller를 사용하는 Common Window 제품 root의 Session과 application slot 입력이다.
 *
 * active·bounds·placement·mode·stacking과 control callback은 root가 계산하므로 caller가
 * 덮어쓸 수 없다. 실제 File Explorer·Chrome body는 `children` slot의 Application owner가 제공한다.
 */
export type WindowRootProps = Omit<
  WindowFrameProps,
  | "active"
  | "bounds"
  | "maximized"
  | "mode"
  | "onFocusCapture"
  | "onPointerDownCapture"
  | "onResizeStart"
  | "titleBar"
  | "variant"
  | "zIndex"
> &
  Readonly<{
    /** WindowStore snapshot에서 찾을 정확한 runtime Session identity다. */
    sessionId: WindowSessionId;
    /** application tab strip 또는 현재 제목을 Common titlebar 왼쪽 slot에 렌더링한다. */
    titleBarContent: ReactNode;
    /** runtime의 `windowPresentation`과 같은 객체를 전달해 mount 전 요청을 이어 받는다. */
    presentationBinding?: WindowPresentationBinding;
    /** WindowStore 초기화와 동일한 bounds·최소 크기 설정이다. */
    placementConfig: WindowPlacementConfig;
    /** 제품 root가 실제 Taskbar application icon에서 측정한 viewport px destination이다. */
    minimizeDestination?: WindowMotionDestination | null;
    /** root capture activation 뒤에도 호출할 caller의 native focus callback이다. */
    onFocusCapture?: WindowFrameProps["onFocusCapture"];
    /** root capture activation 뒤에도 호출할 caller의 native pointer callback이다. */
    onPointerDownCapture?: WindowFrameProps["onPointerDownCapture"];
  }>;

/**
 * Window controller의 authoritative snapshot을 Common Window controlled props와 Action으로 투영한다.
 *
 * 초기화 전이거나 Session이 사라졌으면 렌더링하지 않는다. pointer/focus activation과 controls는
 * 기존 `WindowAction` queue를 사용하며 presentation 요청 자체를 완료했다고 보고하지 않는다.
 */
export const WindowRoot = ({
  children,
  onFocusCapture,
  onPointerDownCapture,
  minimizeDestination = null,
  presentationBinding,
  placementConfig,
  ref,
  sessionId,
  titleBarContent,
  ...props
}: WindowRootProps) => {
  const { actions, viewModel } = useWindowController();
  const [presentation, setPresentation] = useState<WindowPresentationRequest | null>(null);
  const activationRequested = useRef(false);
  const snapshot = viewModel.status === "ready" ? viewModel.snapshot : null;
  const session = snapshot?.sessions.find(({ id }) => id === sessionId);
  const active = snapshot?.activeSessionId === sessionId;
  const presentationLifecycle = useWindowPresentation(ref, {
    actions,
    active,
    destination: minimizeDestination,
    minimized: session?.frame.minimized ?? false,
    presentation,
  });
  const pointerGesture = useWindowPointerGesture(
    actions,
    sessionId,
    snapshot?.workArea ?? null,
    placementConfig,
    presentationLifecycle.interruptForGesture,
  );

  useEffect(() => {
    if (active) activationRequested.current = false;
  }, [active]);

  useEffect(() => {
    if (presentationBinding === undefined) {
      setPresentation(null);
      return undefined;
    }
    const consume: WindowPresentationConsumer = (request) => setPresentation(request);
    return presentationBinding.mount(sessionId, consume);
  }, [presentationBinding, sessionId]);

  /** 같은 render cycle의 pointer→focus 연속 입력이 activate Action을 중복 예약하지 않게 전달한다. */
  const requestActivation = useCallback(() => {
    if (active || activationRequested.current) return;
    activationRequested.current = true;
    actions.execute({ type: "activate", sessionId });
  }, [actions, active, sessionId]);

  /** root capture에서 Session을 활성화한 뒤 caller의 pointer callback을 보존한다. */
  const handlePointerDownCapture = (event: PointerEvent<HTMLElement>) => {
    requestActivation();
    onPointerDownCapture?.(event);
  };

  /** keyboard 또는 programmatic focus 진입도 같은 activate Action으로 연결한다. */
  const handleFocusCapture = (event: FocusEvent<HTMLElement>) => {
    presentationLifecycle.rememberFocus(event);
    requestActivation();
    onFocusCapture?.(event);
  };

  /** 정확한 Session을 기존 Window Action queue로 전달하고 완료를 현재 event에서 가정하지 않는다. */
  const executeSessionAction = (action: WindowAction) => {
    actions.execute(action);
  };

  /** 빈 titlebar pointer 입력을 이동 후보로 전달한다. */
  const startMove = (event: PointerEvent<HTMLDivElement>) => {
    pointerGesture.startMove(event);
  };

  /** resize handle의 pointer 입력을 즉시 resize gesture로 전달한다. */
  const startResize: NonNullable<WindowFrameProps["onResizeStart"]> = (event, direction) => {
    pointerGesture.startResize(event, direction);
  };

  if (snapshot === null || session === undefined) return null;

  const stackingIndex = snapshot.stackingOrder.indexOf(sessionId);
  const maximized = session.frame.placement === "maximized";
  const resolvedBounds = getWindowBounds(session.frame, snapshot.workArea, snapshot.mode);
  const bounds = Object.freeze({
    left: resolvedBounds.x,
    top: resolvedBounds.y,
    width: resolvedBounds.width,
    height: resolvedBounds.height,
  });

  return (
    <WindowFrame
      {...props}
      active={active}
      aria-hidden={session.frame.minimized ? true : undefined}
      bounds={bounds}
      data-gesture-active={pointerGesture.active ? "true" : undefined}
      data-presentation-operation-id={presentation?.operationId}
      data-presentation-phase={presentation?.phase}
      hidden={session.frame.minimized}
      inert={session.frame.minimized ? true : undefined}
      maximized={maximized}
      mode={snapshot.mode}
      onFocusCapture={handleFocusCapture}
      onPointerDownCapture={handlePointerDownCapture}
      ref={presentationLifecycle.frameRef}
      tabIndex={-1}
      titleBar={
        <WindowTitleBar
          controls={
            <WindowControls
              maximized={maximized}
              mode={snapshot.mode}
              onClose={() => executeSessionAction({ type: "close", sessionId })}
              onMinimize={() => executeSessionAction({ type: "minimize", sessionId })}
              onToggleMaximized={() => executeSessionAction({ type: "toggle-maximize", sessionId })}
            />
          }
          onMoveStart={startMove}
          onToggleMaximized={() => executeSessionAction({ type: "toggle-maximize", sessionId })}
        >
          {titleBarContent}
        </WindowTitleBar>
      }
      onResizeStart={startResize}
      variant={session.kind}
      zIndex={stackingIndex + 1}
    >
      {children}
    </WindowFrame>
  );
};
