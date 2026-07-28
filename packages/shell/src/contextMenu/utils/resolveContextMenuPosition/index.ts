import type { ContextMenuPosition } from "@window/ui";

export const CONTEXT_MENU_VIEWPORT_PADDING = 8;

export interface ResolveContextMenuPositionOptions {
  /** 메뉴를 연 pointer 또는 keyboard 기준점의 viewport x 좌표. */
  anchorX: number;
  /** 메뉴를 연 pointer 또는 keyboard 기준점의 viewport y 좌표. */
  anchorY: number;
  /** 실제 menu surface의 측정 높이. */
  menuHeight: number;
  /** 실제 menu surface의 측정 너비. */
  menuWidth: number;
  /** viewport 경계와 menu 사이의 최소 여백. 기본값은 8px이다. */
  viewportPadding?: number;
  /** 현재 viewport 높이. */
  viewportHeight: number;
  /** 현재 viewport 너비. */
  viewportWidth: number;
}

const clamp = (value: number, minimum: number, maximum: number) =>
  Math.min(Math.max(value, minimum), Math.max(minimum, maximum));

/**
 * 기준점의 Context Menu 좌표를 viewport 안으로 보정하고 실제 세로 배치 방향을 반환한다.
 *
 * @param options 기준점 좌표, 측정한 메뉴 크기와 viewport 크기
 * @returns ContextMenuUI에 전달할 좌표와 top/bottom 배치
 */
export const resolveContextMenuPosition = ({
  anchorX,
  anchorY,
  menuHeight,
  menuWidth,
  viewportHeight,
  viewportPadding = CONTEXT_MENU_VIEWPORT_PADDING,
  viewportWidth,
}: ResolveContextMenuPositionOptions): ContextMenuPosition => {
  const spaceAbove = anchorY - viewportPadding;
  const spaceBelow = viewportHeight - anchorY - viewportPadding;
  const placement = spaceBelow >= menuHeight || spaceBelow >= spaceAbove ? "bottom" : "top";
  const horizontalPosition =
    anchorX + menuWidth + viewportPadding <= viewportWidth
      ? {
          left: clamp(anchorX, viewportPadding, viewportWidth - menuWidth - viewportPadding),
        }
      : {
          right: clamp(
            viewportWidth - anchorX,
            viewportPadding,
            viewportWidth - menuWidth - viewportPadding,
          ),
        };
  const verticalPosition =
    placement === "bottom"
      ? {
          top: clamp(anchorY, viewportPadding, viewportHeight - menuHeight - viewportPadding),
        }
      : {
          bottom: clamp(
            viewportHeight - anchorY,
            viewportPadding,
            viewportHeight - menuHeight - viewportPadding,
          ),
        };

  return {
    ...horizontalPosition,
    placement,
    ...verticalPosition,
  };
};
