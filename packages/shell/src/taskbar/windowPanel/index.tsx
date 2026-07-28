"use client";

import type { MouseEvent } from "react";

import type {
  WindowItem,
  WindowItemActionId,
  WindowItemActionState,
  WindowsPanelItemSource,
} from "@window/ui";
import { WindowsPanelUI } from "@window/ui";

import { useTaskbarPins } from "../../windows/providers/taskbarPinsProvider";
import { useWindowDispatch } from "../../windows/providers/windowsEventsProvider";
import { useWindowPinAnimation, useWindowsPins } from "../../windows/providers/windowsPinsProvider";
import { useTaskbarPanelRootContext } from "../panel/hooks/useTaskbarPanelRootContext";
import { useWindowPanelCategories } from "./hooks/useWindowPanelCategories";
import { useWindowPanelNavigation } from "./hooks/useWindowPanelNavigation";
import { useWindowPanelSearch } from "./hooks/useWindowPanelSearch";

/**
 * Taskbar 시작 panel의 검색 input, 검색 결과와 pinned/all view를 조립한다.
 * Navigation/search/category hook과 Windows domain action을 WindowsPanelUI에 연결한다.
 */
export const TaskbarWindowPanel = () => {
  const panel = useTaskbarPanelRootContext();
  const dispatch = useWindowDispatch();
  const taskbarPins = useTaskbarPins();
  const windowsPins = useWindowsPins();
  const pinAnimation = useWindowPinAnimation();
  const search = useWindowPanelSearch();
  const navigation = useWindowPanelNavigation({
    searchActive: search.isActive,
  });
  const categories = useWindowPanelCategories({
    allViewSelected: navigation.browseView === "all",
  });
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

  const dispatchOpen = (
    eventName: "windowOpen" | "windowOpenLocation",
    item: WindowItem,
    source: WindowsPanelItemSource,
  ) => {
    panel.close();
    dispatch(eventName, { item, source });
  };

  const handleOpenItem = (item: WindowItem, source: WindowsPanelItemSource) => {
    dispatchOpen("windowOpen", item, source);
  };

  const handleDetailAction = (action: WindowItemActionId, item: WindowItem) => {
    switch (action) {
      case "open":
        dispatchOpen("windowOpen", item, "search");
        break;
      case "openLocation":
        dispatchOpen("windowOpenLocation", item, "search");
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

  const handleItemContextMenu = (
    event: MouseEvent<HTMLButtonElement>,
    item: WindowItem,
    source: WindowsPanelItemSource,
  ) => {
    event.preventDefault();
    dispatch("windowContextMenuRequested", { item, source });
  };

  return (
    <WindowsPanelUI>
      <WindowsPanelUI.SearchInput
        onChange={(event) => search.onQueryChange(event.currentTarget.value)}
        value={search.query}
      />
      {navigation.activeView === "search" ? (
        <WindowsPanelUI.SearchResults
          detailActions={detailActions}
          detailItemId={search.detailItemId}
          onDetailAction={handleDetailAction}
          onDetailItemChange={search.onDetailItemChange}
          onItemContextMenu={(event, item) => handleItemContextMenu(event, item, "search")}
          onSelectItem={(item) => handleOpenItem(item, "search")}
          results={search.results}
        />
      ) : (
        <WindowsPanelUI.View
          allListRef={categories.allListRef}
          categoryOverlayOpen={categories.categoryOverlayOpen}
          onCategoryOverlayOpenChange={categories.onCategoryOverlayOpenChange}
          onCategorySelect={categories.onCategorySelect}
          onItemContextMenu={handleItemContextMenu}
          onPinnedItemAnimationEnd={pinAnimation.onPinnedItemAnimationEnd}
          onPinnedItemTransitionEnd={pinAnimation.onPinnedItemTransitionEnd}
          onSelectItem={handleOpenItem}
          onViewChange={navigation.onBrowseViewChange}
          pinnedItemAnimation={pinAnimation.pinnedItemAnimation}
          pinnedItems={pinAnimation.pinnedItems}
          sections={categories.sections}
          view={navigation.browseView}
        />
      )}
    </WindowsPanelUI>
  );
};
