"use client";

import type { MouseEvent } from "react";

import type { WindowItem, WindowItemActionId, WindowItemActionState } from "@window/ui";
import { TaskSearchResultViewUI } from "@window/ui";

import { useTaskbarPins } from "../../../windows/providers/taskbarPinsProvider";
import { useWindowDispatch } from "../../../windows/providers/windowsEventsProvider";
import { useWindowsPins } from "../../../windows/providers/windowsPinsProvider";
import { useTaskbarPanelRootContext } from "../../panel/hooks/useTaskbarPanelRootContext";
import type { UseWindowPanelSearchResult } from "../hooks/useWindowPanelSearch";

interface WindowPanelSearchViewProps {
  /** Window panel root가 소유하는 검색어, 결과와 상세 선택 controller. */
  search: UseWindowPanelSearchResult;
}

/**
 * Window panel 검색 결과와 상세 action을 Windows domain에 연결한다.
 * 검색 input과 search 화면 전환 상태는 소유하지 않는다.
 *
 * @param props.search Window panel root가 소유하는 검색 controller
 */
export const WindowPanelSearchView = ({ search }: WindowPanelSearchViewProps) => {
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

  const handleItemContextMenu = (event: MouseEvent<HTMLButtonElement>, item: WindowItem) => {
    event.preventDefault();
    dispatch("windowContextMenuRequested", { item, source: "search" });
  };

  return (
    <TaskSearchResultViewUI
      className="wb-windows-panel__search-results"
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
