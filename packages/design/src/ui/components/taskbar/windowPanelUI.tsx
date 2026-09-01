import { clsx } from "clsx";

import type { WindowPanelUIProps } from "./taskbarUI.types";

import "./taskbarUI.css";

/**
 * taskbar에서 열리는 600px Windows panel의 surface와 transition 상태를 표현한다.
 *
 * TaskbarPanelUI가 위치, portal과 lifecycle을 소유하고 검색·view presentation은 Taskbar 제품 조합이 전달한다.
 */
export const WindowPanelUI = ({
  className,
  hidden,
  motion = "full",
  state = "visible",
  ...props
}: WindowPanelUIProps) => (
  <section
    {...props}
    className={clsx("wd-window-panel-ui", className)}
    data-motion={motion}
    data-state={state}
    hidden={hidden || state === "hidden"}
  />
);
