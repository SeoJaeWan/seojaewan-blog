"use client";

import type { MouseEvent } from "react";
import { useCallback, useContext, useMemo } from "react";

import type {
  WindowItem,
  WindowItemActionId,
  WindowItemActionState,
  WindowsPanelItemSource,
} from "@window/ui";

import { useWindowDispatch } from "../../../../windows/hooks/useWindowDispatch";
import { useTaskbarPins } from "../../../../windows/providers/taskbarPinsProvider";
import { useWindowsPins } from "../../../../windows/providers/windowsPinsProvider";
import { TaskbarPanelHostContext } from "../../../panelHost";

export interface UseTaskbarWindowPanelInteractionsResult {
  /** 현재 상세 item의 pin 상태에서 계산한 고정 action 목록. */
  detailActions: readonly WindowItemActionState[];
  /** 검색 상세 action을 Windows dispatch 또는 pin hook으로 전달한다. */
  onDetailAction: (action: WindowItemActionId, item: WindowItem) => void;
  /** native context menu를 막고 serializable Windows event를 전달한다. */
  onItemContextMenu: (
    event: MouseEvent<HTMLButtonElement>,
    item: WindowItem,
    source: WindowsPanelItemSource,
  ) => void;
  /** item을 연 surface를 보존하고 시작 panel을 닫은 뒤 event를 전달한다. */
  onOpenItem: (item: WindowItem, source: WindowsPanelItemSource) => void;
}

/**
 * 시작 panel의 item action을 TaskbarPanelHost와 Windows domain hook에 연결한다.
 * open 계열만 panel을 닫고 pin/context menu 동작은 열린 panel 상태를 유지한다.
 */
export const useTaskbarWindowPanelInteractions = (
  detailItem: WindowItem | null,
): UseTaskbarWindowPanelInteractionsResult => {
  const panelHost = useContext(TaskbarPanelHostContext);
  const dispatch = useWindowDispatch();
  const taskbarPins = useTaskbarPins();
  const windowsPins = useWindowsPins();

  if (panelHost === null) {
    throw new Error("useTaskbarWindowPanelInteractions는 TaskbarPanelHost 안에서 사용해야 합니다.");
  }

  const detailActions = useMemo<readonly WindowItemActionState[]>(() => {
    if (detailItem === null) {
      return [];
    }

    return [
      { id: "openLocation" },
      {
        id: windowsPins.isPinned(detailItem.id) ? "unpinFromStart" : "pinToStart",
      },
      {
        id: taskbarPins.isPinned(detailItem.id) ? "unpinFromTaskbar" : "pinToTaskbar",
      },
    ];
  }, [detailItem, taskbarPins, windowsPins]);

  const dispatchOpen = useCallback(
    (
      eventName: "windowOpen" | "windowOpenLocation",
      item: WindowItem,
      source: WindowsPanelItemSource,
    ) => {
      panelHost.closePanel();
      dispatch(eventName, { item, source });
    },
    [dispatch, panelHost],
  );

  const onOpenItem = useCallback(
    (item: WindowItem, source: WindowsPanelItemSource) => {
      dispatchOpen("windowOpen", item, source);
    },
    [dispatchOpen],
  );

  const onDetailAction = useCallback(
    (action: WindowItemActionId, item: WindowItem) => {
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
    },
    [dispatchOpen, taskbarPins, windowsPins],
  );

  const onItemContextMenu = useCallback(
    (event: MouseEvent<HTMLButtonElement>, item: WindowItem, source: WindowsPanelItemSource) => {
      event.preventDefault();
      dispatch("windowContextMenuRequested", { item, source });
    },
    [dispatch],
  );

  return useMemo(
    () => ({ detailActions, onDetailAction, onItemContextMenu, onOpenItem }),
    [detailActions, onDetailAction, onItemContextMenu, onOpenItem],
  );
};
