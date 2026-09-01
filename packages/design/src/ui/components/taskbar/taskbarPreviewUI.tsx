import { clsx } from "clsx";

import type { TaskbarPreviewUIProps } from "./taskbarUI.types";

import "./taskbarUI.css";

/**
 * taskbar item 위에 표시할 generic preview slot과 transition 상태만 표현한다.
 *
 * 위치, portal, hover timer와 preview content 생산은 caller가 소유한다.
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
