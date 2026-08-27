import { Button as BaseButton } from "@base-ui/react/button";
import { clsx } from "clsx";

import type { ButtonUIProps } from "./button-ui.types";

import "./button-ui.css";

/** A native button with the design package's visual and accessibility defaults. */
export const ButtonUI = ({ className, type = "button", ...props }: ButtonUIProps) => (
  <BaseButton {...props} className={clsx("wd-button-ui", className)} type={type} />
);
