import { clsx } from "clsx";

import type { TaskbarRootUIProps } from "./taskbarUI.types";

import "./taskbarUI.css";

/**
 * viewport 하단에 고정되는 Windows taskbar의 50px glass surface와 중앙 정렬을 표현한다.
 *
 * global z-order와 panel lifecycle은 Shell이 소유한다.
 */
export const TaskbarRootUI = ({ className, ...props }: TaskbarRootUIProps) => (
  <nav {...props} className={clsx("wd-taskbar-root-ui", className)} />
);
