import { Input as BaseInput } from "@base-ui/react/input";
import { clsx } from "clsx";

import type { InputUIProps } from "./inputUI.types";

import "./inputUI.css";

/**
 * A styled native input for text entry and accessible form labeling.
 * It does not own validation, submission, or application search state.
 */
export const InputUI = ({ className, type = "text", ...props }: InputUIProps) => (
  <BaseInput {...props} className={clsx("wd-input-ui", className)} type={type} />
);
