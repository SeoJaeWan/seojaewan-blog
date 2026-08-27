import { clsx } from "clsx";

import { ButtonUI } from "../button";
import type { IconButtonUIProps } from "./iconButtonUI.types";

import "./iconButtonUI.css";

/**
 * Renders an icon-only native button with a required project-owned accessible label.
 * IconButtonUI does not infer the label or decide which application action runs.
 */
export const IconButtonUI = ({ className, icon, label, ...props }: IconButtonUIProps) => (
  <ButtonUI {...props} aria-label={label} className={clsx("wd-icon-button-ui", className)}>
    <span aria-hidden="true" className="wd-icon-button-ui__icon">
      {icon}
    </span>
  </ButtonUI>
);
