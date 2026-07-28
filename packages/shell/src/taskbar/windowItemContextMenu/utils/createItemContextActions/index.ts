import type { WindowItemContextActionState } from "@window/ui";

import type { WindowsPanelItemSource } from "../../../../windows/types";

export interface CreateItemContextActionsOptions {
  /** Context Menu 대상 WindowItem ID. */
  itemId: string;
  /** 우클릭 요청이 발생한 pinned/all/search 화면. */
  source: WindowsPanelItemSource;
  /** 현재 taskbar pin ID 순서. */
  taskbarPinnedIds: readonly string[];
  /** 현재 Windows pin ID 순서. */
  windowsPinnedIds: readonly string[];
}

/**
 * 현재 source와 pin 상태에서 WindowItem Context Menu에 표시할 action을 계산한다.
 *
 * @param options 대상 item, source와 두 pin 목록
 * @returns 현재 항목에서 실행할 수 있는 context action 상태 목록
 */
export const createItemContextActions = ({
  itemId,
  source,
  taskbarPinnedIds,
  windowsPinnedIds,
}: CreateItemContextActionsOptions): readonly WindowItemContextActionState[] => {
  const actions: WindowItemContextActionState[] = [];
  const windowsPinnedIndex = windowsPinnedIds.indexOf(itemId);

  if (source === "pinned" && windowsPinnedIndex >= 0) {
    if (windowsPinnedIndex > 1) {
      actions.push({ id: "moveToFront" });
    }

    if (windowsPinnedIndex > 0) {
      actions.push({ id: "moveLeft" });
    }

    if (windowsPinnedIndex < windowsPinnedIds.length - 1) {
      actions.push({ id: "moveRight" });
    }
  }

  actions.push(
    { id: "openLocation" },
    {
      id: windowsPinnedIds.includes(itemId) ? "unpinFromStart" : "pinToStart",
    },
    {
      id: taskbarPinnedIds.includes(itemId) ? "unpinFromTaskbar" : "pinToTaskbar",
    },
  );

  return actions;
};
