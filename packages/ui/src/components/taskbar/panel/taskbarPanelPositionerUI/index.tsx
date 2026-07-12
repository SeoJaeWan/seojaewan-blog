import type { ComponentPropsWithRef } from "react";

import { clsx } from "clsx";

export type TaskbarPanelPositionerUIProps = ComponentPropsWithRef<"div">;

/**
 * Taskbar panel visual을 외부에서 주입한 viewport 좌표에 고정한다.
 * DOM 측정, placement 계산과 닫기 정책은 외부 기능 계층이 담당한다.
 *
 * @param props.children 고정 좌표에 표시할 taskbar panel visual
 * @param props.className positioner root에 추가할 className
 * @param props.style bottom, left, visibility 등 외부에서 계산한 visual style
 */
export const TaskbarPanelPositionerUI = ({
  children,
  className,
  ...props
}: TaskbarPanelPositionerUIProps) => (
  <div className={clsx("wb-taskbar-panel-item", className)} {...props}>
    {children}
  </div>
);
