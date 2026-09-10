import type { ReactElement, ReactNode } from "react";
import { useId } from "react";

import { Popover } from "@base-ui/react/popover";

import { TaskbarPanelSurface } from "../surface/index.js";
import { useTaskbarPanelAnchor } from "./hooks/useTaskbarPanelAnchor/index.js";
import { useTaskbarPanelInteraction } from "./hooks/useTaskbarPanelInteraction/index.js";
import { useTaskbarPanelTransition } from "./hooks/useTaskbarPanelTransition/index.js";

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
  const { triggerRef, resolveAnchor } = useTaskbarPanelAnchor(variant);
  const completeTransition = useTaskbarPanelTransition(
    open,
    onTransitionCancel,
    onTransitionComplete,
  );
  const { handleOpenChange, handleTriggerFocus, handleTriggerClick } = useTaskbarPanelInteraction({
    open,
    variant,
    onOpenChange,
  });

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
        onClick={handleTriggerClick}
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
