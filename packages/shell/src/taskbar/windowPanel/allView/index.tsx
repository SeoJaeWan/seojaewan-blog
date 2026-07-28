"use client";

import type { WindowItem, WindowItemContextActionId } from "@window/ui";
import { WindowsPanelAllViewUI } from "@window/ui";

import { useContextMenuTrigger } from "../../../contextMenu";
import { useTaskbarPins } from "../../../windows/providers/taskbarPinsProvider";
import { useWindowDispatch } from "../../../windows/providers/windowsEventsProvider";
import { useWindowsPins } from "../../../windows/providers/windowsPinsProvider";
import { useTaskbarPanelRootContext } from "../../panel/hooks/useTaskbarPanelRootContext";
import { createWindowItemContextActions } from "../../windowItemContextMenu/utils/createWindowItemContextActions";
import { resolveWindowItemContextEntries } from "../../windowItemContextMenu/utils/resolveWindowItemContextEntries";
import { useWindowPanelViewContext } from "../view/hooks/useWindowPanelViewContext";
import { useWindowPanelCategories } from "./hooks/useWindowPanelCategories";

/** 모두 화면의 category, item action, Context Menu와 Windows event를 연결한다. */
export const WindowPanelAllView = () => {
  const navigation = useWindowPanelViewContext();
  const panel = useTaskbarPanelRootContext();
  const dispatch = useWindowDispatch();
  const taskbarPins = useTaskbarPins();
  const windowsPins = useWindowsPins();
  const categories = useWindowPanelCategories({
    allViewActive: navigation.view === "all",
  });

  const dispatchOpen = (eventName: "windowOpen" | "windowOpenLocation", item: WindowItem) => {
    panel.close();
    dispatch(eventName, { item, source: "all" });
  };
  const handleContextAction = (actionId: WindowItemContextActionId, item: WindowItem) => {
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
  const handleItemContextMenu = useContextMenuTrigger<WindowItem, WindowItemContextActionId>({
    getEntries: (item) =>
      resolveWindowItemContextEntries(
        createWindowItemContextActions({
          itemId: item.id,
          taskbarPinnedIds: taskbarPins.pinnedIds,
          windowsPinnedIds: windowsPins.pinnedIds,
        }),
      ),
    onAction: handleContextAction,
    onOpen: (item) => dispatch("windowContextMenuRequested", { item, source: "all" }),
  });

  return (
    <WindowsPanelAllViewUI
      active={navigation.view === "all"}
      categoryOverlayOpen={categories.categoryOverlayOpen}
      listRef={categories.allListRef}
      onBack={navigation.showPinned}
      onCategoryOverlayOpenChange={categories.onCategoryOverlayOpenChange}
      onCategorySelect={categories.onCategorySelect}
      onItemContextMenu={handleItemContextMenu}
      onItemSelect={(item) => dispatchOpen("windowOpen", item)}
      sections={categories.sections}
    />
  );
};
