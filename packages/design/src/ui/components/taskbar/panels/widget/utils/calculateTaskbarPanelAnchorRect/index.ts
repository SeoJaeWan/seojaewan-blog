import type { TaskbarPanelWidgetVariant } from "../../index.js";

/**
 * 측정된 숫자로 Start 중앙 또는 Search 왼쪽 anchor를 계산한다.
 * Taskbar 상단이 없으면 trigger 상단을 사용하며 입력이나 DOM을 변경하지 않는다.
 */
export const calculateTaskbarPanelAnchorRect = ({
  variant,
  viewportWidth,
  triggerBounds,
  taskbarTop,
}: Readonly<{
  variant: TaskbarPanelWidgetVariant;
  viewportWidth: number;
  triggerBounds: Readonly<{ left: number; top: number; width: number }>;
  taskbarTop?: number;
}>): Readonly<{ x: number; y: number; width: number; height: number }> => ({
  height: 0,
  width: variant === "start" ? 0 : triggerBounds.width,
  x: variant === "start" ? viewportWidth / 2 : triggerBounds.left,
  y: taskbarTop ?? triggerBounds.top,
});
