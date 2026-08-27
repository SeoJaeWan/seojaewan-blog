import type { ButtonUIProps } from "./button-ui.types";
import { ButtonUIAdapter } from "./button-ui-adapter";

import "./button-ui.css";

const mergeClassNames = (className: string | undefined) =>
  className === undefined ? "button-ui" : `button-ui ${className}`;

/** A native button with the design package's visual and accessibility defaults. */
export const ButtonUI = ({ className, type = "button", ...props }: ButtonUIProps) => (
  <ButtonUIAdapter {...props} className={mergeClassNames(className)} type={type} />
);
