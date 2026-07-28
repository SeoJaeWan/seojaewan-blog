"use client";

import type { MouseEvent } from "react";

import type { WindowItem, WindowsPanelViewMode } from "@window/ui";
import { WindowsPanelViewUI } from "@window/ui";

import { useWindowDispatch } from "../../../windows/providers/windowsEventsProvider";
import { useWindowPinAnimation } from "../../../windows/providers/windowsPinsProvider";
import type { WindowsPanelItemSource } from "../../../windows/types";
import { useTaskbarPanelRootContext } from "../../panel/hooks/useTaskbarPanelRootContext";
import { useItemContextMenu, WindowItemContextMenuLayer } from "../../windowItemContextMenu";
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
  const itemContextMenu = useItemContextMenu();
  const categories = useWindowPanelCategories({
    allViewActive: view === "all",
  });

  const handleOpenItem = (item: WindowItem, source: WindowsPanelItemSource) => {
    panel.close();
    dispatch("windowOpen", { item, source });
  };

  const handleItemContextMenu = (
    event: MouseEvent<HTMLButtonElement>,
    item: WindowItem,
    source: WindowsPanelItemSource,
  ) => {
    event.preventDefault();
    dispatch("windowContextMenuRequested", { item, source });
    itemContextMenu.open({
      anchorX: event.clientX,
      anchorY: event.clientY,
      item,
      source,
      triggerElement: event.currentTarget,
    });
  };

  return (
    <>
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
      <WindowItemContextMenuLayer contextMenu={itemContextMenu} />
    </>
  );
};
