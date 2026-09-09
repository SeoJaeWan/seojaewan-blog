import type { ReactElement, ReactNode } from "react";
import { useCallback, useEffect, useId, useRef } from "react";

import { Popover } from "@base-ui/react/popover";

import { TaskbarPanelSurface } from "../surface/index.js";

import "./taskbarPanelWidget.css";

/** Taskbar panel이 표현하는 제품 위치 종류다. */
export type TaskbarPanelWidgetVariant = "search" | "start";

/** 제품 상태 계층에 전달하는 panel open 변경 원인이다. */
export type TaskbarPanelOpenChangeReason =
  "escape" | "focus-out" | "outside" | "trigger" | "unknown";

/** Taskbar panel widget의 controlled props다. */
export type TaskbarPanelWidgetProps = Readonly<{
  /** Popup 안에 표시할 실제 제품 본문이다. */
  children: ReactNode;
  /** Base UI Trigger가 제품 event props를 합성할 실제 Start button 또는 Search input이다. */
  trigger: ReactElement;
  /** Start 중앙 정렬 또는 Search 왼쪽 정렬을 선택한다. */
  variant: TaskbarPanelWidgetVariant;
  /** 제품 headless 상태가 소유하는 현재 open 값이다. */
  open: boolean;
  /** trigger, Escape, outside 또는 실제 focus loss가 요청한 open 변경을 전달한다. */
  onOpenChange: (open: boolean, reason: TaskbarPanelOpenChangeReason) => void;
  /** enter 또는 exit transition이 현재 목표 상태에서 끝났음을 전달한다. */
  onTransitionComplete?: (open: boolean) => void;
  /** 진행 중 transition이 반대 상태 변경이나 unmount로 중단됐음을 전달한다. */
  onTransitionCancel?: (open: boolean) => void;
  /** Portal을 붙일 문서 내 container다. 기본값은 document.body다. */
  portalContainer?: HTMLElement | null;
}>;

/** Base UI의 상세 원인을 제품 Component의 안정된 open 변경 원인으로 좁힌다. */
const resolveOpenChangeReason = (reason: string): TaskbarPanelOpenChangeReason => {
  switch (reason) {
    case "escape-key":
      return "escape";
    case "focus-out":
      return "focus-out";
    case "outside-press":
      return "outside";
    case "trigger-focus":
    case "trigger-press":
      return "trigger";
    default:
      return "unknown";
  }
};

/** controlled open 값마다 완료 또는 중단 callback을 정확히 한 번 연결한다. */
const useTransitionCallbacks = (
  open: boolean,
  onTransitionCancel: TaskbarPanelWidgetProps["onTransitionCancel"],
  onTransitionComplete: TaskbarPanelWidgetProps["onTransitionComplete"],
) => {
  const mountedRef = useRef(false);
  const pendingRef = useRef<boolean | null>(open ? true : null);
  const cancelRef = useRef(onTransitionCancel);
  const completeRef = useRef(onTransitionComplete);

  cancelRef.current = onTransitionCancel;
  completeRef.current = onTransitionComplete;

  useEffect(() => {
    if (!mountedRef.current) {
      mountedRef.current = true;
      return;
    }

    const pending = pendingRef.current;
    if (pending !== null && pending !== open) {
      cancelRef.current?.(pending);
    }
    pendingRef.current = open;
  }, [open]);

  useEffect(
    () => () => {
      const pending = pendingRef.current;
      if (pending !== null) {
        cancelRef.current?.(pending);
        pendingRef.current = null;
      }
    },
    [],
  );

  /** Base UI가 관찰한 실제 CSS transition 완료를 현재 목표와 대조해 전달한다. */
  const complete = (completedOpen: boolean) => {
    if (pendingRef.current !== completedOpen) {
      return;
    }
    pendingRef.current = null;
    completeRef.current?.(completedOpen);
  };

  return complete;
};

/**
 * Start와 Search panel의 anchor, portal, dismiss, focus, presence와 motion을 조합한다.
 *
 * active panel identity와 switch 순서는 headless가 소유하며 이 Component는 전달받은
 * controlled open 상태를 Base UI 1.7.0 Popover에 직접 연결한다.
 */
export const TaskbarPanelWidget = ({
  children,
  onOpenChange,
  onTransitionCancel,
  onTransitionComplete,
  open,
  portalContainer,
  trigger,
  variant,
}: TaskbarPanelWidgetProps) => {
  const generatedId = useId();
  const triggerId = `taskbar-panel-${variant}-${generatedId.replaceAll(":", "")}`;
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const completeTransition = useTransitionCallbacks(open, onTransitionCancel, onTransitionComplete);

  /** Base UI dismiss를 제품 open 요청으로 전달하고 Search Escape focus를 제거한다. */
  const handleOpenChange = (nextOpen: boolean, details: Popover.Root.ChangeEventDetails) => {
    const reason = resolveOpenChangeReason(details.reason);

    if (!nextOpen && variant === "search" && reason === "escape") {
      const activeElement = document.activeElement;
      if (activeElement instanceof HTMLElement) {
        activeElement.blur();
      }
    }

    onOpenChange(nextOpen, reason);
  };

  /** Search input의 keyboard/pointer focus도 동일한 controlled open 요청으로 연결한다. */
  const handleTriggerFocus = () => {
    if (variant === "search" && !open) {
      onOpenChange(true, "trigger");
    }
  };

  /** 두 panel은 Taskbar 상단을 공통 세로 기준으로 삼고 가로 의미만 variant별로 나눈다. */
  const resolveAnchor = useCallback(() => {
    const triggerElement = triggerRef.current;
    if (triggerElement === null) return null;

    const triggerBounds = triggerElement.getBoundingClientRect();
    const taskbarBounds = triggerElement
      .closest('.taskbar-root, nav[aria-label="작업 표시줄"]')
      ?.getBoundingClientRect();
    const anchorTop = taskbarBounds?.top ?? triggerBounds.top;
    const start = variant === "start";

    return {
      contextElement: triggerElement,
      getBoundingClientRect: () =>
        DOMRect.fromRect({
          height: 0,
          width: start ? 0 : triggerBounds.width,
          x: start ? window.innerWidth / 2 : triggerBounds.left,
          y: anchorTop,
        }),
    };
  }, [variant]);

  return (
    <Popover.Root
      modal={false}
      onOpenChange={handleOpenChange}
      onOpenChangeComplete={completeTransition}
      open={open}
      triggerId={triggerId}
    >
      <Popover.Trigger
        id={triggerId}
        nativeButton={variant === "start"}
        onClick={(event) => {
          if (variant === "search") {
            event.preventBaseUIHandler();
          }
        }}
        onFocus={handleTriggerFocus}
        ref={triggerRef}
        render={trigger}
        role={variant === "search" ? "textbox" : undefined}
      />
      <Popover.Portal container={portalContainer}>
        <Popover.Positioner
          align={variant === "start" ? "center" : "start"}
          anchor={resolveAnchor}
          className="taskbar-panel-widget__positioner"
          collisionAvoidance={{ align: "shift", fallbackAxisSide: "none", side: "none" }}
          collisionPadding={8}
          positionMethod="fixed"
          side="top"
          sideOffset={8}
        >
          <Popover.Popup
            aria-hidden={open ? undefined : true}
            aria-label={variant === "start" ? "시작" : "검색"}
            className="taskbar-panel-widget__popup"
            finalFocus={variant === "search" ? false : true}
            initialFocus={false}
            inert={open ? undefined : true}
            render={
              <TaskbarPanelSurface
                availableHeight="var(--available-height)"
                availableWidth="var(--available-width)"
                variant={variant}
              />
            }
          >
            {children}
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  );
};
