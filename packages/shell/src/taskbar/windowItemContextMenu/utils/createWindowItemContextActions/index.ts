import type { WindowItemContextActionState } from "@window/ui";

export interface CreateWindowItemContextActionsOptions {
  /** Context Menu 대상 WindowItem ID. */
  itemId: string;
  /** 현재 taskbar pin ID 순서. */
  taskbarPinnedIds: readonly string[];
  /** 현재 Windows pin ID 순서. */
  windowsPinnedIds: readonly string[];
}

/**
 * All·Search surface의 WindowItem에 공통으로 표시할 location과 pin action을 계산한다.
 *
 * @param options 대상 item과 두 pin 목록
 * @returns 현재 항목에서 실행할 수 있는 공통 context action 상태
 */
export const createWindowItemContextActions = ({
  itemId,
  taskbarPinnedIds,
  windowsPinnedIds,
}: CreateWindowItemContextActionsOptions): readonly WindowItemContextActionState[] => [
  { id: "openLocation" },
  {
    id: windowsPinnedIds.includes(itemId) ? "unpinFromStart" : "pinToStart",
  },
  {
    id: taskbarPinnedIds.includes(itemId) ? "unpinFromTaskbar" : "pinToTaskbar",
  },
];

/**
 * Pinned surface의 WindowItem에 위치별 reorder와 공통 action을 계산한다.
 *
 * @param options 대상 item과 두 pin 목록
 * @returns Pinned surface에서 실행할 수 있는 context action 상태
 */
export const createPinnedWindowItemContextActions = (
  options: CreateWindowItemContextActionsOptions,
): readonly WindowItemContextActionState[] => {
  const { itemId, windowsPinnedIds } = options;
  const actions: WindowItemContextActionState[] = [];
  const windowsPinnedIndex = windowsPinnedIds.indexOf(itemId);

  if (windowsPinnedIndex >= 0) {
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

  return [...actions, ...createWindowItemContextActions(options)];
};
