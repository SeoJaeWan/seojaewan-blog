"use client";

import type { RefObject } from "react";
import { useCallback, useId } from "react";

import { TaskbarStartButtonUI } from "@window/ui";

import { useTaskbarPanel } from "../panelHost/hooks/useTaskbarPanel";
import { TaskbarWindowPanel } from "../windowPanel";

const TASKBAR_START_PANEL_ID = "taskbar-start-panel";

export interface TaskbarStartButtonProps {
  /** useRef로 생성한 시작 button DOM 참조. */
  ref?: RefObject<HTMLButtonElement | null>;
}

/**
 * Taskbar 시작 버튼과 Windows 시작 패널을 TaskbarPanelHost에 연결한다.
 * button 상태, 접근성 연결, panel 위치와 portal 조립을 소유한다.
 *
 * @param props.ref useRef로 생성한 시작 button DOM 참조
 * @returns 시작 button과 열린 panel portal
 */
export const TaskbarStartButton = ({ ref }: TaskbarStartButtonProps) => {
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

  return (
    <>
      <TaskbarStartButtonUI
        aria-controls={panelElementId}
        aria-expanded={isOpen}
        aria-haspopup="dialog"
        asChild={false}
        onClick={toggle}
        ref={handleTriggerRef}
        selected={isOpen}
        type="button"
      />
      {renderPanel(<TaskbarWindowPanel id={panelElementId} />)}
    </>
  );
};
