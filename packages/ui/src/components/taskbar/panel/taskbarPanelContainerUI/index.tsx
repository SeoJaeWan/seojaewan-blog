import type { ComponentPropsWithRef } from "react";

import { clsx } from "clsx";

/** Taskbar panel container의 visual transition 상태. */
export type TaskbarPanelContainerState = "closing" | "open" | "opening";

export interface TaskbarPanelContainerUIProps extends Omit<
  ComponentPropsWithRef<"div">,
  "aria-hidden" | "inert"
> {
  /** container의 visual transition 상태. 기본값은 animation이 없는 "open"이다. */
  state?: TaskbarPanelContainerState;
}

/**
 * Taskbar panel visual을 viewport 좌표에 고정하고 열림과 닫힘 transition을 렌더링한다.
 * DOM 측정, placement 계산과 transition lifecycle 정책은 외부 기능 계층이 담당한다.
 *
 * @param props.children 고정 좌표에 표시할 taskbar panel visual
 * @param props.className container root에 추가할 className
 * @param props.state container의 visual transition 상태. 기본값은 "open"
 */
export const TaskbarPanelContainerUI = ({
  children,
  className,
  state = "open",
  ...props
}: TaskbarPanelContainerUIProps) => (
  <div
    {...props}
    aria-hidden={state === "closing" ? true : undefined}
    className={clsx("wb-taskbar-panel-container", className)}
    data-state={state}
    inert={state !== "open"}
  >
    {children}
  </div>
);
