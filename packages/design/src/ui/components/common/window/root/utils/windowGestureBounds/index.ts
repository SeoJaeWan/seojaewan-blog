import {
  resizeWindowBounds,
  type WindowGestureHandle,
  type WindowPlacementConfig,
  type WindowRect,
  type WindowResizeDirection,
} from "../../../../../../../headless/windows/index.js";

type WindowGestureBoundsInput = Readonly<{
  handle: WindowGestureHandle | null;
  placementConfig: WindowPlacementConfig;
  resizeDirection: WindowResizeDirection | null;
  startPointer: Readonly<{ x: number; y: number }>;
  workArea: WindowRect;
}>;

/**
 * Pointer 위치를 move 또는 resize gesture가 제출할 px bounds로 변환한다.
 */
export const calculateWindowGestureBounds = (
  gesture: WindowGestureBoundsInput,
  pointer: Readonly<{ x: number; y: number }>,
): WindowRect => {
  const { handle, resizeDirection, startPointer } = gesture;
  if (handle === null) {
    throw new Error("활성화되지 않은 Window gesture의 bounds를 계산할 수 없습니다");
  }
  const deltaX = pointer.x - startPointer.x;
  const deltaY = pointer.y - startPointer.y;

  if (handle.kind === "move") {
    if (handle.startFrame.placement === "maximized") {
      const horizontalRatio = Math.min(
        1,
        Math.max(0, (startPointer.x - handle.startBounds.x) / handle.startBounds.width),
      );
      const normalBounds = handle.startFrame.normalBounds;
      return {
        x: pointer.x - normalBounds.width * horizontalRatio,
        y: pointer.y - (startPointer.y - handle.startBounds.y),
        width: normalBounds.width,
        height: normalBounds.height,
      };
    }

    return {
      ...handle.startBounds,
      x: handle.startBounds.x + deltaX,
      y: handle.startBounds.y + deltaY,
    };
  }

  return resizeDirection === null
    ? handle.startBounds
    : resizeWindowBounds(
        handle.startBounds,
        resizeDirection,
        { x: deltaX, y: deltaY },
        gesture.workArea,
        gesture.placementConfig,
      );
};
