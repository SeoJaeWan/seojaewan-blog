"use client";

import type { ComponentProps, MouseEvent, MouseEventHandler, RefObject } from "react";
import { useCallback, useId } from "react";

import type {
  TaskbarStartButtonUIProps,
  WindowItem,
  WindowsPanelItemSource,
  WindowsPanelUIProps,
} from "@window/ui";
import { TaskbarStartButtonUI, WindowsPanelUI } from "@window/ui";

import { useTaskbarPanel } from "../panelHost/hooks/useTaskbarPanel";

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

type WindowsPanelSearchInputProps = ComponentProps<typeof WindowsPanelUI.SearchInput>;
type WindowsPanelSearchResultsProps = ComponentProps<typeof WindowsPanelUI.SearchResults>;
type WindowsPanelViewProps = ComponentProps<typeof WindowsPanelUI.View>;

// REMOVE: Work Unit 1에서 기존 panelProps를 compound children에 연결하기 위한 shell-local bridge다. Work Unit 5의 최종 TaskbarStartButton props 전환 시 제거한다.
type TaskbarStartPanelProps = Omit<WindowsPanelUIProps, "aria-label" | "children" | "id"> & {
  allListRef?: WindowsPanelViewProps["allListRef"];
  categoryOverlayOpen?: WindowsPanelViewProps["categoryOverlayOpen"];
  detailActions?: WindowsPanelSearchResultsProps["detailActions"];
  detailItemId?: WindowsPanelSearchResultsProps["detailItemId"];
  onCategoryOverlayOpenChange?: WindowsPanelViewProps["onCategoryOverlayOpenChange"];
  onCategorySelect?: WindowsPanelViewProps["onCategorySelect"];
  onDetailAction?: WindowsPanelSearchResultsProps["onDetailAction"];
  onDetailItemChange?: WindowsPanelSearchResultsProps["onDetailItemChange"];
  onItemContextMenu?: (
    event: MouseEvent<HTMLButtonElement>,
    item: WindowItem,
    source: WindowsPanelItemSource,
  ) => void;
  onPinnedItemAnimationEnd?: WindowsPanelViewProps["onPinnedItemAnimationEnd"];
  onPinnedItemTransitionEnd?: WindowsPanelViewProps["onPinnedItemTransitionEnd"];
  onSelectItem?: WindowsPanelSearchResultsProps["onSelectItem"];
  onViewChange?: WindowsPanelViewProps["onViewChange"];
  pinnedItemAnimation?: WindowsPanelViewProps["pinnedItemAnimation"];
  pinnedItems?: WindowsPanelViewProps["pinnedItems"];
  searchInputProps?: WindowsPanelSearchInputProps;
  searchResults?: WindowsPanelSearchResultsProps["results"];
  searchValue?: string;
  sections?: WindowsPanelViewProps["sections"];
  view?: WindowsPanelViewProps["view"];
};

export interface TaskbarStartButtonProps extends Omit<
  TaskbarStartButtonUIProps,
  TaskbarStartButtonControlledProp
> {
  /** 시작 panel compound children에 나눠 전달할 임시 controlled content props. */
  panelProps?: TaskbarStartPanelProps;
  /** useRef로 생성한 시작 button DOM 참조. */
  ref?: RefObject<HTMLButtonElement | null>;
}

/**
 * Taskbar 시작 버튼과 Windows 시작 패널을 TaskbarPanelHost에 연결한다.
 * button 상태, 접근성 연결, panel 위치와 portal 조립을 소유한다.
 *
 * @param props.panelProps WindowsPanelUI에 전달할 controlled content props
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
  const {
    allListRef,
    categoryOverlayOpen,
    detailActions,
    detailItemId,
    onCategoryOverlayOpenChange,
    onCategorySelect,
    onDetailAction,
    onDetailItemChange,
    onItemContextMenu,
    onPinnedItemAnimationEnd,
    onPinnedItemTransitionEnd,
    onSelectItem,
    onViewChange,
    pinnedItemAnimation,
    pinnedItems,
    searchInputProps,
    searchResults,
    searchValue,
    sections,
    view,
    ...windowsPanelProps
  } = panelProps ?? {};

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

  // REMOVE: 기존 panelProps 동작을 보존하는 inline compound 조립이다. Work Unit 4의 TaskbarWindowPanel 도입 시 이동한다.
  const windowsPanel = (
    <WindowsPanelUI {...windowsPanelProps} aria-label={ariaLabel} id={panelElementId}>
      <WindowsPanelUI.SearchInput {...searchInputProps} />
      {searchValue ? (
        <WindowsPanelUI.SearchResults
          detailActions={detailActions}
          detailItemId={detailItemId}
          onDetailAction={onDetailAction}
          onDetailItemChange={onDetailItemChange}
          onItemContextMenu={
            onItemContextMenu
              ? (event, item) => onItemContextMenu(event, item, "search")
              : undefined
          }
          onSelectItem={onSelectItem}
          results={searchResults}
        />
      ) : (
        <WindowsPanelUI.View
          allListRef={allListRef}
          categoryOverlayOpen={categoryOverlayOpen}
          onCategoryOverlayOpenChange={onCategoryOverlayOpenChange}
          onCategorySelect={onCategorySelect}
          onItemContextMenu={onItemContextMenu}
          onPinnedItemAnimationEnd={onPinnedItemAnimationEnd}
          onPinnedItemTransitionEnd={onPinnedItemTransitionEnd}
          onSelectItem={onSelectItem}
          onViewChange={onViewChange}
          pinnedItemAnimation={pinnedItemAnimation}
          pinnedItems={pinnedItems}
          sections={sections}
          view={view}
        />
      )}
    </WindowsPanelUI>
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
      {renderPanel(windowsPanel)}
    </>
  );
};
