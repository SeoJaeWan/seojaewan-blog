import { clsx } from "clsx";

import type { TaskbarPanelContainerUIProps } from "./taskbarUI.types";

import "./taskbarUI.css";

/** Popover placement 안에서 taskbar panel의 pointer와 presence visual을 격리하는 container다. */
export const TaskbarPanelContainerUI = ({
  className,
  hidden,
  motion = "full",
  state = "visible",
  ...props
}: TaskbarPanelContainerUIProps) => (
  <div
    {...props}
    className={clsx("wd-taskbar-panel-container-ui", className)}
    data-motion={motion}
    data-state={state}
    hidden={hidden || state === "hidden"}
  />
);
