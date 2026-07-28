"use client";

import type { MouseEvent } from "react";

import type { WindowItem, WindowItemContextActionId, WindowsPanelViewMode } from "@window/ui";
import { WindowsPanelViewUI } from "@window/ui";

import { useContextMenuTrigger } from "../../../contextMenu";
import { useTaskbarPins } from "../../../windows/providers/taskbarPinsProvider";
import { useWindowDispatch } from "../../../windows/providers/windowsEventsProvider";
import {
  useWindowPinAnimation,
  useWindowsPins,
} from "../../../windows/providers/windowsPinsProvider";
import type { WindowsPanelItemSource } from "../../../windows/types";
import { useTaskbarPanelRootContext } from "../../panel/hooks/useTaskbarPanelRootContext";
import {
  createPinnedWindowItemContextActions,
  createWindowItemContextActions,
} from "../../windowItemContextMenu/utils/createWindowItemContextActions";
import { resolveWindowItemContextEntries } from "../../windowItemContextMenu/utils/resolveWindowItemContextEntries";
import { useWindowPanelCategories } from "./hooks/useWindowPanelCategories";

interface WindowPanelBrowseViewProps {
  /** pinned/all browse 화면 변경을 navigation에 전달한다. */
  onViewChange: (view: WindowsPanelViewMode) => void;
  /** 현재 표시할 pinned/all browse 화면. */
  view: WindowsPanelViewMode;
}

/**
 * Window panel의 pinned/all 화면과 category·pin animation을 Windows domain에 연결한다.
 * search 화면 전환과 검색 상태는 소유하지 않는다.
 *
 * @param props.view 현재 표시할 pinned/all browse 화면
 * @param props.onViewChange browse 화면 변경 callback
 */
export const WindowPanelBrowseView = ({ onViewChange, view }: WindowPanelBrowseViewProps) => {
  const panel = useTaskbarPanelRootContext();
  const dispatch = useWindowDispatch();
  const pinAnimation = useWindowPinAnimation();
  const taskbarPins = useTaskbarPins();
  const windowsPins = useWindowsPins();
  const categories = useWindowPanelCategories({
    allViewActive: view === "all",
  });

  const handleOpenItem = (item: WindowItem, source: WindowsPanelItemSource) => {
    panel.close();
    dispatch("windowOpen", { item, source });
  };

  const handleContextAction = (
    actionId: WindowItemContextActionId,
    item: WindowItem,
    source: "all" | "pinned",
  ) => {
    const itemId = item.id;
    const pinnedIndex = windowsPins.pinnedIds.indexOf(itemId);

    switch (actionId) {
      case "open":
        panel.close();
        dispatch("windowOpen", { item, source });
        return;
      case "openLocation":
        panel.close();
        dispatch("windowOpenLocation", { item, source });
        return;
      case "pinToStart":
        windowsPins.pin(itemId);
        return;
      case "unpinFromStart":
        windowsPins.unpin(itemId);
        return;
      case "pinToTaskbar":
        taskbarPins.pin(itemId);
        return;
      case "unpinFromTaskbar":
        taskbarPins.unpin(itemId);
        return;
      case "moveToFront":
        if (pinnedIndex > 0) {
          windowsPins.reorder(itemId, 0);
        }
        return;
      case "moveLeft":
        if (pinnedIndex > 0) {
          windowsPins.reorder(itemId, pinnedIndex - 1);
        }
        return;
      case "moveRight":
        if (pinnedIndex >= 0 && pinnedIndex < windowsPins.pinnedIds.length - 1) {
          windowsPins.reorder(itemId, pinnedIndex + 1);
        }
    }
  };
  const handlePinnedItemContextMenu = useContextMenuTrigger<WindowItem, WindowItemContextActionId>({
    getEntries: (item) =>
      resolveWindowItemContextEntries(
        createPinnedWindowItemContextActions({
          itemId: item.id,
          taskbarPinnedIds: taskbarPins.pinnedIds,
          windowsPinnedIds: windowsPins.pinnedIds,
        }),
      ),
    onAction: (actionId, item) => handleContextAction(actionId, item, "pinned"),
    onOpen: (item) => dispatch("windowContextMenuRequested", { item, source: "pinned" }),
  });
  const handleAllItemContextMenu = useContextMenuTrigger<WindowItem, WindowItemContextActionId>({
    getEntries: (item) =>
      resolveWindowItemContextEntries(
        createWindowItemContextActions({
          itemId: item.id,
          taskbarPinnedIds: taskbarPins.pinnedIds,
          windowsPinnedIds: windowsPins.pinnedIds,
        }),
      ),
    onAction: (actionId, item) => handleContextAction(actionId, item, "all"),
    onOpen: (item) => dispatch("windowContextMenuRequested", { item, source: "all" }),
  });

  const handleItemContextMenu = (
    event: MouseEvent<HTMLButtonElement>,
    item: WindowItem,
    source: WindowsPanelItemSource,
  ) => {
    if (source === "pinned") {
      handlePinnedItemContextMenu(event, item);
    } else {
      handleAllItemContextMenu(event, item);
    }
  };

  return (
    <WindowsPanelViewUI
      allListRef={categories.allListRef}
      categoryOverlayOpen={categories.categoryOverlayOpen}
      onCategoryOverlayOpenChange={categories.onCategoryOverlayOpenChange}
      onCategorySelect={categories.onCategorySelect}
      onItemContextMenu={handleItemContextMenu}
      onPinnedItemAnimationEnd={pinAnimation.onPinnedItemAnimationEnd}
      onPinnedItemTransitionEnd={pinAnimation.onPinnedItemTransitionEnd}
      onSelectItem={handleOpenItem}
      onViewChange={onViewChange}
      pinnedItemAnimation={pinAnimation.pinnedItemAnimation}
      pinnedItems={pinAnimation.pinnedItems}
      sections={categories.sections}
      view={view}
    />
  );
};
