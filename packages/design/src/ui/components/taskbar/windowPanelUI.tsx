import { clsx } from "clsx";

import type { WindowPanelUIProps } from "./taskbarUI.types";

import "./taskbarUI.css";

/**
 * taskbar에서 열리는 600px Windows panel의 surface와 transition 상태를 표현한다.
 *
 * 검색, view, product action, 위치, portal과 lifecycle 전환은 caller가 slot으로 조합한다.
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
