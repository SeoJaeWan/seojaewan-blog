import { ButtonUI } from "../button";
import type { IconButtonUIProps } from "./icon-button-ui.types";

import "./icon-button-ui.css";

const mergeClassNames = (className: string | undefined) =>
  className === undefined ? "icon-button-ui" : `icon-button-ui ${className}`;

/** An icon-only native button with a required project-owned accessible label. */
export const IconButtonUI = ({ className, icon, label, ...props }: IconButtonUIProps) => (
  <ButtonUI {...props} aria-label={label} className={mergeClassNames(className)}>
    <span aria-hidden="true" className="icon-button-ui__icon">
      {icon}
    </span>
  </ButtonUI>
);
