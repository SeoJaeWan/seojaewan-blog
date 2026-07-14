"use client";

import type { MouseEventHandler, RefObject } from "react";
import { useCallback, useId } from "react";

import type { TaskbarStartButtonUIProps } from "@window/ui";
import { TaskbarStartButtonUI } from "@window/ui";

import { useTaskbarPanel } from "../panelHost/hooks/useTaskbarPanel";
import type { TaskbarWindowPanelProps } from "../windowPanel";
import { TaskbarWindowPanel } from "../windowPanel";

const TASKBAR_START_PANEL_ID = "taskbar-start-panel";

type TaskbarStartButtonControlledProp =
  | "aria-controls"
  | "aria-expanded"
  | "aria-haspopup"
  | "aria-pressed"
  | "asChild"
  | "children"
  | "ref"
  | "selected"
  | "type";

// REMOVE: Work Unit 1에서 기존 panelProps를 compound children에 연결하기 위한 shell-local bridge다. Work Unit 5의 최종 TaskbarStartButton props 전환 시 제거한다.
type TaskbarStartPanelProps = Omit<TaskbarWindowPanelProps, "aria-label" | "id">;

export interface TaskbarStartButtonProps extends Omit<
  TaskbarStartButtonUIProps,
  TaskbarStartButtonControlledProp
> {
  /** 내부 TaskbarWindowPanel에 전달할 임시 content props. */
  panelProps?: TaskbarStartPanelProps;
  /** useRef로 생성한 시작 button DOM 참조. */
  ref?: RefObject<HTMLButtonElement | null>;
}

/**
 * Taskbar 시작 버튼과 Windows 시작 패널을 TaskbarPanelHost에 연결한다.
 * button 상태, 접근성 연결, panel 위치와 portal 조립을 소유한다.
 *
 * @param props.panelProps 내부 TaskbarWindowPanel에 전달할 임시 content props
 * @param props.aria-label button과 panel의 접근성 이름. 기본값은 "시작"
 * @param props.onClick 외부 button click callback. preventDefault 시 panel 상태를 바꾸지 않는다
 * @param props.ref useRef로 생성한 시작 button DOM 참조
 * @returns 시작 button과 열린 panel portal
 */
export const TaskbarStartButton = ({
  "aria-label": ariaLabel = "시작",
  onClick,
  panelProps,
  ref,
  ...buttonProps
}: TaskbarStartButtonProps) => {
  const panelElementId = `taskbar-start-panel-${useId()}`;
  const { isOpen, renderPanel, toggle, triggerRef } = useTaskbarPanel({
    panelId: TASKBAR_START_PANEL_ID,
    placement: "rootCenter",
  });
  const handleTriggerRef = useCallback(
    (element: HTMLButtonElement | null) => {
      triggerRef.current = element;

      if (ref) {
        ref.current = element;
      }
    },
    [ref, triggerRef],
  );

  const handleClick: MouseEventHandler<HTMLButtonElement> = useCallback(
    (event) => {
      onClick?.(event);

      if (!event.defaultPrevented) {
        toggle();
      }
    },
    [onClick, toggle],
  );

  return (
    <>
      <TaskbarStartButtonUI
        {...buttonProps}
        aria-controls={panelElementId}
        aria-expanded={isOpen}
        aria-haspopup="dialog"
        aria-label={ariaLabel}
        asChild={false}
        onClick={handleClick}
        ref={handleTriggerRef}
        selected={isOpen}
        type="button"
      />
      {renderPanel(
        <TaskbarWindowPanel
          {...panelProps}
          aria-label={ariaLabel}
          id={panelElementId}
        />,
      )}
    </>
  );
};
