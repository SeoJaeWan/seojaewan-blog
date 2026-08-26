import { Button as BaseButton } from "@base-ui/react/button";

import type { ButtonProps } from "../../contracts";

export const Button = ({ children, disabled, onPress, ref, render }: ButtonProps) => (
  <BaseButton
    disabled={disabled}
    nativeButton={!render || render.type === "button"}
    onClick={onPress}
    ref={ref}
    render={render}
    type={render ? undefined : "button"}
  >
    {children}
  </BaseButton>
);
