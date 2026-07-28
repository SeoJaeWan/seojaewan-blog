"use client";

import { createPortal } from "react-dom";

import type { WindowItemContextActionId } from "@window/ui";
import { ContextMenuButtonUI, ContextMenuUI, resolveWindowItemActionVisuals } from "@window/ui";

import { useTaskbarPins } from "../../windows/providers/taskbarPinsProvider";
import { useWindowDispatch } from "../../windows/providers/windowsEventsProvider";
import { useWindowsPins } from "../../windows/providers/windowsPinsProvider";
import { useTaskbarPanelRootContext } from "../panel/hooks/useTaskbarPanelRootContext";
import type { UseItemContextMenu } from "./hooks/useItemContextMenu";
import { useItemContextMenu } from "./hooks/useItemContextMenu";
import { createItemContextActions } from "./utils/createItemContextActions";

export interface WindowItemContextMenuLayerProps {
  /** 화면이 소유한 Window item Context Menu controller. */
  contextMenu: UseItemContextMenu;
}

/**
 * Window item Context Menu의 UI, Portal과 Windows action을 조립한다.
 * 대상, 위치와 browser lifecycle은 전달받은 controller가 소유한다.
 *
 * @param props.contextMenu 화면이 소유한 Context Menu controller
 */
export const WindowItemContextMenuLayer = ({ contextMenu }: WindowItemContextMenuLayerProps) => {
  const panel = useTaskbarPanelRootContext();
  const dispatch = useWindowDispatch();
  const taskbarPins = useTaskbarPins();
  const windowsPins = useWindowsPins();
  const target = contextMenu.target;

  if (target === null || panel.layerElement === null) {
    return null;
  }

  const actions = createItemContextActions({
    itemId: target.item.id,
    source: target.source,
    taskbarPinnedIds: taskbarPins.pinnedIds,
    windowsPinnedIds: windowsPins.pinnedIds,
  });
  const visualActions = resolveWindowItemActionVisuals<WindowItemContextActionId>(actions);

  const handlePanelClosingAction = (eventName: "windowOpen" | "windowOpenLocation") => {
    contextMenu.close({ restoreFocus: false });
    panel.close();
    dispatch(eventName, { item: target.item, source: target.source });
  };

  const handleAction = (actionId: WindowItemContextActionId) => {
    const itemId = target.item.id;
    const pinnedIndex = windowsPins.pinnedIds.indexOf(itemId);

    switch (actionId) {
      case "open":
        handlePanelClosingAction("windowOpen");
        return;
      case "openLocation":
        handlePanelClosingAction("windowOpenLocation");
        return;
      case "pinToStart":
        windowsPins.pin(itemId);
        break;
      case "unpinFromStart":
        windowsPins.unpin(itemId);
        break;
      case "pinToTaskbar":
        taskbarPins.pin(itemId);
        break;
      case "unpinFromTaskbar":
        taskbarPins.unpin(itemId);
        break;
      case "moveToFront":
        if (pinnedIndex > 0) {
          windowsPins.reorder(itemId, 0);
        }
        break;
      case "moveLeft":
        if (pinnedIndex > 0) {
          windowsPins.reorder(itemId, pinnedIndex - 1);
        }
        break;
      case "moveRight":
        if (pinnedIndex >= 0 && pinnedIndex < windowsPins.pinnedIds.length - 1) {
          windowsPins.reorder(itemId, pinnedIndex + 1);
        }
        break;
    }

    contextMenu.close();
  };

  return createPortal(
    <ContextMenuUI
      animated={target.source !== "search"}
      menuRef={contextMenu.menuRef}
      onBackdropPointerDown={() => contextMenu.close()}
      position={contextMenu.position}
    >
      {visualActions.map((action) => (
        <ContextMenuButtonUI
          key={action.id}
          data-context-menu-action={action.id}
          disabled={action.disabled}
          icon={action.icon}
          label={action.label}
          onClick={() => handleAction(action.id)}
        />
      ))}
    </ContextMenuUI>,
    panel.layerElement,
  );
};

export type {
  CloseItemContextMenuOptions,
  ItemContextMenuTarget,
  OpenItemContextMenuOptions,
  UseItemContextMenu,
} from "./hooks/useItemContextMenu";
export { useItemContextMenu };
