import { Button as BaseButton } from "@base-ui/react/button";
import { clsx } from "clsx";

import type { ButtonUIProps } from "./buttonUI.types";

import "./buttonUI.css";

/**
 * Renders a native action button with the design package's visual and accessibility defaults.
 * ButtonUI does not decide which application action runs when it is activated.
 */
export const ButtonUI = ({ className, type = "button", ...props }: ButtonUIProps) => (
  <BaseButton {...props} className={clsx("wd-button-ui", className)} type={type} />
);
