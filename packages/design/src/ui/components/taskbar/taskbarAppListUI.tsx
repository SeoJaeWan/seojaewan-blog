import { clsx } from "clsx";

import type { TaskbarAppListUIProps } from "./taskbarUI.types";

import "./taskbarUI.css";

/**
 * Taskbar app items를 한 줄로 배치하는 순수 layout이다.
 *
 * item 계산, pin과 session 상태는 caller가 제공한다.
 */
export const TaskbarAppListUI = ({ className, ...props }: TaskbarAppListUIProps) => (
  <div {...props} className={clsx("wd-taskbar-app-list-ui", className)} />
);
