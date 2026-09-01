import { clsx } from "clsx";

import { IconButtonUI } from "../../primitives";
import type { TaskbarStartButtonUIProps } from "./taskbarUI.types";

import "./taskbarUI.css";

const WindowsLogo = () => (
  <svg
    aria-hidden="true"
    className="wd-taskbar-start-button-ui__logo"
    focusable="false"
    viewBox="0 0 24 24"
  >
    <path d="M2 3.2 10.6 2v9.2H2V3.2Zm9.6-1.3L22 .5v10.7H11.6V1.9ZM2 12.2h8.6V22L2 20.8v-8.6Zm9.6 0H22V23.5l-10.4-1.4v-9.9Z" />
  </svg>
);

/**
 * Windows logo가 있는 40px Start action을 IconButtonUI 위에 표현한다.
 *
 * panel의 open policy, anchor와 lifecycle은 caller가 PopoverUI 또는 Shell에서 조합한다.
 */
export const TaskbarStartButtonUI = ({
  className,
  icon = <WindowsLogo />,
  ...props
}: TaskbarStartButtonUIProps) => (
  <IconButtonUI
    {...props}
    className={clsx("wd-taskbar-start-button-ui", className)}
    icon={icon}
    label="시작"
    size="lg"
  />
);
