import { clsx } from "clsx";

import type { TaskbarPreviewUIProps } from "./taskbarUI.types";

import "./taskbarUI.css";

/**
 * taskbar item 위에 표시할 generic preview slot과 transition 상태만 표현한다.
 *
 * TaskbarPanelUI가 위치와 portal lifecycle을 제공하며 preview content와 hover intent는 상위 Taskbar 조합이 전달한다.
 */
export const TaskbarPreviewUI = ({
  className,
  hidden,
  motion = "full",
  preview,
  state = "visible",
  ...props
}: TaskbarPreviewUIProps) => (
  <section
    {...props}
    className={clsx("wd-taskbar-preview-ui", className)}
    data-motion={motion}
    data-state={state}
    hidden={hidden || state === "hidden"}
  >
    {preview}
  </section>
);
