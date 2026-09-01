import { clsx } from "clsx";

import type { TaskbarPanelLayerUIProps } from "./taskbarUI.types";

import "./taskbarUI.css";

/** Taskbar root가 document portal에 한 번만 만드는 pointer-transparent floating layer다. */
export const TaskbarPanelLayerUI = ({ className, ...props }: TaskbarPanelLayerUIProps) => (
  <div
    {...props}
    className={clsx("wd-taskbar-panel-layer-ui", className)}
    data-taskbar-panel-layer=""
  />
);
