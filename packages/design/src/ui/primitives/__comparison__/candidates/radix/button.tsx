import { cloneElement, type KeyboardEvent as ReactKeyboardEvent } from "react";

import { Slot } from "@radix-ui/react-slot";

import type { ButtonProps } from "../../contracts";

export const Button = ({ children, disabled = false, onPress, ref, render }: ButtonProps) => {
  const handleClick = () => {
    if (!disabled) {
      onPress?.();
    }
  };

  if (render) {
    const composedElement =
      children === undefined ? render : cloneElement(render, undefined, children);
    const handleKeyDown = (event: ReactKeyboardEvent<HTMLElement>) => {
      if (!disabled && (event.key === "Enter" || event.key === " ")) {
        event.preventDefault();
        onPress?.();
      }
    };

    return (
      <Slot
        aria-disabled={disabled || undefined}
        data-comparison-disabled={disabled || undefined}
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        ref={ref}
        role="button"
        tabIndex={disabled ? -1 : 0}
      >
        {composedElement}
      </Slot>
    );
  }

  return (
    <button disabled={disabled} onClick={handleClick} ref={ref} type="button">
      {children}
    </button>
  );
};
