import { clsx } from "clsx";

import { ButtonUI } from "../../primitives";
import type { PanelIconButtonUIProps } from "./taskbarUI.types";

import "./taskbarUI.css";

/** Start/Search grid의 accessible icon tile과 one/two-line title visual이다. */
export const PanelIconButtonUI = ({
  className,
  icon,
  lines = 2,
  selected = false,
  title,
  type = "button",
  ...props
}: PanelIconButtonUIProps) => (
  <ButtonUI
    {...props}
    aria-pressed={selected || undefined}
    className={clsx("wd-panel-icon-button-ui", className)}
    data-lines={lines}
    data-selected={selected || undefined}
    title={title}
    type={type}
  >
    <span aria-hidden="true" className="wd-panel-icon-button-ui__icon">
      {icon}
    </span>
    <span className="wd-panel-icon-button-ui__title">{title}</span>
  </ButtonUI>
);
