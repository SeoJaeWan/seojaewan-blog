"use client";

import type { MouseEvent } from "react";

import type {
  WindowItem,
  WindowItemActionId,
  WindowItemActionState,
  WindowItemContextActionId,
} from "@window/ui";
import { TaskSearchResultViewUI } from "@window/ui";

import { useContextMenuTrigger } from "../../../contextMenu";
import { useTaskbarPins } from "../../../windows/providers/taskbarPinsProvider";
import { useWindowDispatch } from "../../../windows/providers/windowsEventsProvider";
import { useWindowsPins } from "../../../windows/providers/windowsPinsProvider";
import { useTaskbarPanelRootContext } from "../../panel/hooks/useTaskbarPanelRootContext";
import { createWindowItemContextActions } from "../../windowItemContextMenu/utils/createWindowItemContextActions";
import { resolveWindowItemContextEntries } from "../../windowItemContextMenu/utils/resolveWindowItemContextEntries";
import type { UseTaskSearchResult } from "../hooks/useTaskSearch";

interface TaskSearchResultViewProps {
  /** 이 검색 결과 surface에 추가할 layout class. */
  className?: string;
  /** Taskbar search feature가 소유하는 검색어, 결과와 상세 선택 controller. */
  search: UseTaskSearchResult;
}

/**
 * Taskbar 검색 결과와 상세 action을 Windows domain에 연결한다.
 * Panel visual, 검색 input과 화면 전환 상태는 소유하지 않는다.
 *
 * @param props.search Taskbar search feature가 소유하는 검색 controller
 * @param props.className 호출 surface가 소유하는 layout class
 */
export const TaskSearchResultView = ({ className, search }: TaskSearchResultViewProps) => {
  const panel = useTaskbarPanelRootContext();
  const dispatch = useWindowDispatch();
  const taskbarPins = useTaskbarPins();
  const windowsPins = useWindowsPins();
  const detailActions: readonly WindowItemActionState[] =
    search.detailItem === null
      ? []
      : [
          { id: "openLocation" },
          {
            id: windowsPins.isPinned(search.detailItem.id) ? "unpinFromStart" : "pinToStart",
          },
          {
            id: taskbarPins.isPinned(search.detailItem.id) ? "unpinFromTaskbar" : "pinToTaskbar",
          },
        ];

  const dispatchOpen = (eventName: "windowOpen" | "windowOpenLocation", item: WindowItem) => {
    panel.close();
    dispatch(eventName, { item, source: "search" });
  };

  const handleDetailAction = (action: WindowItemActionId, item: WindowItem) => {
    switch (action) {
      case "open":
        dispatchOpen("windowOpen", item);
        break;
      case "openLocation":
        dispatchOpen("windowOpenLocation", item);
        break;
      case "pinToStart":
        windowsPins.pin(item.id);
        break;
      case "unpinFromStart":
        windowsPins.unpin(item.id);
        break;
      case "pinToTaskbar":
        taskbarPins.pin(item.id);
        break;
      case "unpinFromTaskbar":
        taskbarPins.unpin(item.id);
        break;
    }
  };
  const handleSearchContextAction = (actionId: WindowItemContextActionId, item: WindowItem) => {
    switch (actionId) {
      case "open":
        dispatchOpen("windowOpen", item);
        return;
      case "openLocation":
        dispatchOpen("windowOpenLocation", item);
        return;
      case "pinToStart":
        windowsPins.pin(item.id);
        return;
      case "unpinFromStart":
        windowsPins.unpin(item.id);
        return;
      case "pinToTaskbar":
        taskbarPins.pin(item.id);
        return;
      case "unpinFromTaskbar":
        taskbarPins.unpin(item.id);
    }
  };
  const handleSearchItemContextMenu = useContextMenuTrigger<WindowItem, WindowItemContextActionId>({
    animated: false,
    getEntries: (item) =>
      resolveWindowItemContextEntries(
        createWindowItemContextActions({
          itemId: item.id,
          taskbarPinnedIds: taskbarPins.pinnedIds,
          windowsPinnedIds: windowsPins.pinnedIds,
        }),
      ),
    onAction: handleSearchContextAction,
    onOpen: (item) => dispatch("windowContextMenuRequested", { item, source: "search" }),
  });

  const handleItemContextMenu = (event: MouseEvent<HTMLButtonElement>, item: WindowItem) => {
    handleSearchItemContextMenu(event, item);
  };

  return (
    <TaskSearchResultViewUI
      className={className}
      detailActions={detailActions}
      detailItemId={search.detailItemId}
      onDetailAction={handleDetailAction}
      onDetailItemChange={search.onDetailItemChange}
      onItemContextMenu={handleItemContextMenu}
      onSelectItem={(item) => dispatchOpen("windowOpen", item)}
      results={search.results}
    />
  );
};
