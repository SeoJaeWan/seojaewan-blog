import type { ReactNode } from "react";

import {
  ArrowLeft16Regular,
  ArrowPrevious16Regular,
  ArrowRight16Regular,
  FolderOpen16Regular,
  Open16Regular,
  Pin16Regular,
  PinOff16Regular,
} from "@fluentui/react-icons";

import type { WindowItemContextActionId } from "../../types/windowItemAction";

export interface WindowItemActionVisual<ActionId extends WindowItemContextActionId> {
  disabled: boolean;
  icon: ReactNode;
  id: ActionId;
  label: string;
}

interface WindowItemActionVisualState<ActionId extends WindowItemContextActionId> {
  disabled?: boolean;
  id: ActionId;
}

const WINDOW_ITEM_ACTION_ORDER = [
  "open",
  "moveToFront",
  "moveLeft",
  "moveRight",
  "openLocation",
  "pinToStart",
  "unpinFromStart",
  "pinToTaskbar",
  "unpinFromTaskbar",
] as const satisfies readonly WindowItemContextActionId[];

const WINDOW_ITEM_ACTION_DEFINITIONS: Record<
  WindowItemContextActionId,
  { icon: ReactNode; label: string }
> = {
  moveLeft: { icon: <ArrowLeft16Regular />, label: "왼쪽으로 이동" },
  moveRight: { icon: <ArrowRight16Regular />, label: "오른쪽으로 이동" },
  moveToFront: { icon: <ArrowPrevious16Regular />, label: "맨 앞으로 이동" },
  open: { icon: <Open16Regular />, label: "열기" },
  openLocation: { icon: <FolderOpen16Regular />, label: "파일 위치 열기" },
  pinToStart: { icon: <Pin16Regular />, label: "시작 화면에 고정" },
  pinToTaskbar: { icon: <Pin16Regular />, label: "작업 표시줄에 고정" },
  unpinFromStart: { icon: <PinOff16Regular />, label: "시작 화면에서 제거" },
  unpinFromTaskbar: { icon: <PinOff16Regular />, label: "작업 표시줄에서 제거" },
};

/**
 * Window item action 상태를 UI가 소유한 순서, label과 icon을 포함한 visual 목록으로 변환한다.
 *
 * @param actions 기능 계층이 현재 항목에 표시하기로 결정한 action 상태
 * @returns UI 표시 순서로 정렬되고 visual metadata가 결합된 action 목록
 */
export const resolveWindowItemActionVisuals = <
  ActionId extends WindowItemContextActionId = WindowItemContextActionId,
>(
  actions: readonly WindowItemActionVisualState<ActionId>[],
): WindowItemActionVisual<ActionId>[] => {
  const actionStates = new Map<WindowItemContextActionId, WindowItemActionVisualState<ActionId>>();

  for (const action of actions) {
    actionStates.set(action.id, action);
  }

  return WINDOW_ITEM_ACTION_ORDER.flatMap((id) => {
    const state = actionStates.get(id);

    if (state === undefined) {
      return [];
    }

    return [
      {
        ...WINDOW_ITEM_ACTION_DEFINITIONS[id],
        disabled: state.disabled ?? false,
        id: id as ActionId,
      },
    ];
  });
};
