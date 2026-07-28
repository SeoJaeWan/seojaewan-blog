"use client";

import type { WindowItem, WindowItemContextActionId } from "@window/ui";
import { WindowsPanelPinnedViewUI } from "@window/ui";

import { useContextMenuTrigger } from "../../../contextMenu";
import { useTaskbarPins } from "../../../windows/providers/taskbarPinsProvider";
import { useWindowDispatch } from "../../../windows/providers/windowsEventsProvider";
import {
  useWindowPinAnimation,
  useWindowsPins,
} from "../../../windows/providers/windowsPinsProvider";
import { useTaskbarPanelRootContext } from "../../panel/hooks/useTaskbarPanelRootContext";
import { createPinnedWindowItemContextActions } from "../../windowItemContextMenu/utils/createWindowItemContextActions";
import { resolveWindowItemContextEntries } from "../../windowItemContextMenu/utils/resolveWindowItemContextEntries";
import { useWindowPanelViewContext } from "../view/hooks/useWindowPanelViewContext";

/** 고정됨 화면의 item, pin animation, Context Menu와 Windows event를 연결한다. */
export const WindowPanelPinnedView = () => {
  const navigation = useWindowPanelViewContext();
  const panel = useTaskbarPanelRootContext();
  const dispatch = useWindowDispatch();
  const pinAnimation = useWindowPinAnimation();
  const taskbarPins = useTaskbarPins();
  const windowsPins = useWindowsPins();

  const dispatchOpen = (eventName: "windowOpen" | "windowOpenLocation", item: WindowItem) => {
    panel.close();
    dispatch(eventName, { item, source: "pinned" });
  };
  const handleContextAction = (actionId: WindowItemContextActionId, item: WindowItem) => {
    const pinnedIndex = windowsPins.pinnedIds.indexOf(item.id);

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
        return;
      case "moveToFront":
        if (pinnedIndex > 0) {
          windowsPins.reorder(item.id, 0);
        }
        return;
      case "moveLeft":
        if (pinnedIndex > 0) {
          windowsPins.reorder(item.id, pinnedIndex - 1);
        }
        return;
      case "moveRight":
        if (pinnedIndex >= 0 && pinnedIndex < windowsPins.pinnedIds.length - 1) {
          windowsPins.reorder(item.id, pinnedIndex + 1);
        }
    }
  };
  const handleItemContextMenu = useContextMenuTrigger<WindowItem, WindowItemContextActionId>({
    getEntries: (item) =>
      resolveWindowItemContextEntries(
        createPinnedWindowItemContextActions({
          itemId: item.id,
          taskbarPinnedIds: taskbarPins.pinnedIds,
          windowsPinnedIds: windowsPins.pinnedIds,
        }),
      ),
    onAction: handleContextAction,
    onOpen: (item) => dispatch("windowContextMenuRequested", { item, source: "pinned" }),
  });

  return (
    <WindowsPanelPinnedViewUI
      active={navigation.view === "pinned"}
      itemAnimation={pinAnimation.pinnedItemAnimation}
      items={pinAnimation.pinnedItems}
      onItemAnimationEnd={pinAnimation.onPinnedItemAnimationEnd}
      onItemContextMenu={handleItemContextMenu}
      onItemSelect={(item) => dispatchOpen("windowOpen", item)}
      onItemTransitionEnd={pinAnimation.onPinnedItemTransitionEnd}
      onShowAll={navigation.showAll}
    />
  );
};
