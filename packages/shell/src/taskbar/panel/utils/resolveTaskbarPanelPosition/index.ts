import type { TaskbarPanelPlacement } from "../../hooks/useTaskbarPanelRootValue";

export interface ResolveTaskbarPanelPositionOptions {
  gap: number;
  panelRect: Pick<DOMRect, "width">;
  placement: TaskbarPanelPlacement;
  triggerRect: Pick<DOMRect, "left" | "top" | "width">;
  viewportHeight: number;
  viewportPadding: number;
  viewportWidth: number;
}

export interface TaskbarPanelPosition {
  bottom: number;
  left: number;
}

const clamp = (value: number, minimum: number, maximum: number) =>
  Math.min(Math.max(value, minimum), maximum);

/**
 * Trigger, panel과 viewport 크기로 taskbar panel 좌표를 계산한다.
 *
 * @param options 배치 기준과 측정값
 * @returns viewport 경계 안으로 보정한 bottom과 left 좌표
 */
export const resolveTaskbarPanelPosition = ({
  gap,
  panelRect,
  placement,
  triggerRect,
  viewportHeight,
  viewportPadding,
  viewportWidth,
}: ResolveTaskbarPanelPositionOptions): TaskbarPanelPosition => {
  const effectivePadding =
    panelRect.width + viewportPadding * 2 <= viewportWidth ? viewportPadding : 0;
  const maximumLeft = Math.max(
    effectivePadding,
    viewportWidth - panelRect.width - effectivePadding,
  );
  let requestedLeft = triggerRect.left;

  if (placement === "center") {
    requestedLeft = triggerRect.left + triggerRect.width / 2 - panelRect.width / 2;
  } else if (placement === "rootCenter") {
    requestedLeft = (viewportWidth - panelRect.width) / 2;
  }

  return {
    bottom: viewportHeight - triggerRect.top + gap,
    left: clamp(requestedLeft, effectivePadding, maximumLeft),
  };
};
