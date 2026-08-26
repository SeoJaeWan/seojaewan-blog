import { Button as ProviderButton } from "@base-ui/react/button";

import type { ButtonProps } from "./types";

export const Button = ({ children, disabled, onPress, ref, render }: ButtonProps) => (
  <ProviderButton
    className="wd-button"
    disabled={disabled}
    nativeButton={!render || render.type === "button"}
    onClick={onPress}
    ref={ref}
    render={render}
    type={render ? undefined : "button"}
  >
    {children}
  </ProviderButton>
);
