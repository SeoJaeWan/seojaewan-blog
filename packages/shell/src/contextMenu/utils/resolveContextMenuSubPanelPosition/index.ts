import type { ContextMenuSubPanelPlacement } from "@window/ui";

import { CONTEXT_MENU_VIEWPORT_PADDING } from "../resolveContextMenuPosition";

export interface ResolveContextMenuSubPanelPositionOptions {
  panelHeight: number;
  panelWidth: number;
  triggerLeft: number;
  triggerRight: number;
  triggerTop: number;
  viewportHeight: number;
  viewportPadding?: number;
  viewportWidth: number;
}

const clamp = (value: number, minimum: number, maximum: number) =>
  Math.min(Math.max(value, minimum), Math.max(minimum, maximum));

/**
 * Submenu를 trigger 오른쪽 또는 왼쪽에 배치하고 세로 위치를 viewport 안으로 보정한다.
 *
 * @param options trigger rect, 측정한 submenu 크기와 viewport 크기
 * @returns ContextMenuSubPanelUI에 전달할 상대 placement
 */
export const resolveContextMenuSubPanelPosition = ({
  panelHeight,
  panelWidth,
  triggerLeft,
  triggerRight,
  triggerTop,
  viewportHeight,
  viewportPadding = CONTEXT_MENU_VIEWPORT_PADDING,
  viewportWidth,
}: ResolveContextMenuSubPanelPositionOptions): ContextMenuSubPanelPlacement => {
  const spaceLeft = triggerLeft - viewportPadding;
  const spaceRight = viewportWidth - triggerRight - viewportPadding;
  const openRight = spaceRight >= panelWidth || spaceRight >= spaceLeft;
  const minimumTop = viewportPadding - triggerTop;
  const maximumTop = viewportHeight - viewportPadding - panelHeight - triggerTop;
  const top = clamp(0, minimumTop, maximumTop);

  return openRight
    ? {
        right: 0,
        top,
        transform: "translateX(100%)",
      }
    : {
        left: 0,
        top,
        transform: "translateX(-100%)",
      };
};
