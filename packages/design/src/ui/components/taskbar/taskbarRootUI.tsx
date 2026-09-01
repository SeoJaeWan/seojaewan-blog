import { clsx } from "clsx";

import type { TaskbarRootUIProps } from "./taskbarUI.types";

import "./taskbarUI.css";

/**
 * Windows taskbar의 50px glass surface와 중앙 정렬만 표현한다.
 *
 * 화면 고정, global z-order와 panel lifecycle은 Shell이 소유한다.
 */
export const TaskbarRootUI = ({ className, ...props }: TaskbarRootUIProps) => (
  <nav {...props} className={clsx("wd-taskbar-root-ui", className)} />
);
