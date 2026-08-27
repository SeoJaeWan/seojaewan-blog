import { clsx } from "clsx";

import { ButtonUI } from "../button";
import type { IconButtonUIProps } from "./icon-button-ui.types";

import "./icon-button-ui.css";

/** An icon-only native button with a required project-owned accessible label. */
export const IconButtonUI = ({ className, icon, label, ...props }: IconButtonUIProps) => (
  <ButtonUI {...props} aria-label={label} className={clsx("wd-icon-button-ui", className)}>
    <span aria-hidden="true" className="wd-icon-button-ui__icon">
      {icon}
    </span>
  </ButtonUI>
);
