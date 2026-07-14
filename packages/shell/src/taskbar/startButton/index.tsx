"use client";

import type { MouseEvent, RefObject } from "react";
import { useCallback, useId } from "react";

import type {
  TaskSearchInputProps,
  WindowItem,
  WindowItemActionId,
  WindowItemActionState,
  WindowsPanelItemSource,
} from "@window/ui";
import { TaskbarStartButtonUI } from "@window/ui";

import { useTaskbarPanel } from "../panelHost/hooks/useTaskbarPanel";
import { TaskbarWindowPanel } from "../windowPanel";

const TASKBAR_START_PANEL_ID = "taskbar-start-panel";

/** Taskbar 시작 panel의 item 실행과 context menu 요청 계약. */
export interface TaskbarStartButtonItemInteractions {
  /** item에 실행할 semantic action과 대상을 기능 계층에 전달한다. */
  onAction?: (action: WindowItemActionId, item: WindowItem) => void;
  /** context menu 요청과 대상 및 발생 영역을 기능 계층에 전달한다. */
  onItemContextMenu?: (
    event: MouseEvent<HTMLButtonElement>,
    item: WindowItem,
    source: WindowsPanelItemSource,
  ) => void;
}

export interface TaskbarStartButtonProps {
  /** REMOVE: Unit 6 전까지 접근성 이름을 전달한다; 내부 고정 한글 문구 전환 시 제거한다. */
  "aria-label"?: string;
  /** 검색 결과 상세 item에 표시할 action 상태 목록. */
  detailActions?: readonly WindowItemActionState[];
  /** panel item의 실행과 context menu 요청 callback. */
  itemInteractions?: TaskbarStartButtonItemInteractions;
  /** pinned view에 표시할 item 목록. */
  pinnedItems?: WindowItem[];
  /** useRef로 생성한 시작 button DOM 참조. */
  ref?: RefObject<HTMLButtonElement | null>;
  /** 현재 검색어 결과 또는 빈 검색어에서의 전체 item 목록. */
  results: WindowItem[];
  /** 검색 input의 controlled value와 native input props. */
  searchInputProps: TaskSearchInputProps;
}

/**
 * Taskbar 시작 버튼과 Windows 시작 패널을 TaskbarPanelHost에 연결한다.
 * button 상태, 접근성 연결, panel 위치와 portal 조립을 소유한다.
 *
 * @param props.aria-label button과 panel의 접근성 이름. 기본값은 "시작"
 * @param props.detailActions 검색 상세 item에 표시할 action 상태 목록
 * @param props.itemInteractions item action과 context menu 요청 callback
 * @param props.pinnedItems pinned view에 표시할 item 목록
 * @param props.ref useRef로 생성한 시작 button DOM 참조
 * @param props.results 현재 검색어 결과 또는 빈 검색어에서의 전체 item 목록
 * @param props.searchInputProps 검색 input의 controlled value와 native input props
 * @returns 시작 button과 열린 panel portal
 */
export const TaskbarStartButton = ({
  "aria-label": ariaLabel = "시작",
  detailActions,
  itemInteractions,
  pinnedItems,
  ref,
  results,
  searchInputProps,
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

  return (
    <>
      <TaskbarStartButtonUI
        aria-controls={panelElementId}
        aria-expanded={isOpen}
        aria-haspopup="dialog"
        aria-label={ariaLabel}
        asChild={false}
        onClick={toggle}
        ref={handleTriggerRef}
        selected={isOpen}
        type="button"
      />
      {renderPanel(
        <TaskbarWindowPanel
          aria-label={ariaLabel}
          detailActions={detailActions}
          id={panelElementId}
          onAction={itemInteractions?.onAction}
          onItemContextMenu={itemInteractions?.onItemContextMenu}
          pinnedItems={pinnedItems}
          results={results}
          searchInputProps={searchInputProps}
        />,
      )}
    </>
  );
};
