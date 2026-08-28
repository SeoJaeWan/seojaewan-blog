import { forwardRef } from "react";

import { Menu as BaseMenu } from "@base-ui/react/menu";
import { clsx } from "clsx";

import type { MenuUIContentProps } from "../../menuUI.types";

/**
 * menu role과 배치·portal 경계를 제공한다.
 *
 * item의 제품 순서나 action 의미는 결정하지 않는다.
 */
export const MenuContentUI = forwardRef<HTMLDivElement, MenuUIContentProps>(function MenuContentUI(
  {
    align = "start",
    alignOffset,
    "aria-label": ariaLabel,
    "aria-labelledby": ariaLabelledBy,
    className,
    collisionPadding = 8,
    finalFocus,
    keepMounted,
    portalContainer,
    side = "bottom",
    sideOffset = 4,
    ...props
  },
  ref,
) {
  return (
    <BaseMenu.Portal container={portalContainer} keepMounted={keepMounted}>
      <BaseMenu.Positioner
        align={align}
        alignOffset={alignOffset}
        className="wd-menu-ui__positioner"
        collisionPadding={collisionPadding}
        side={side}
        sideOffset={sideOffset}
      >
        <BaseMenu.Popup
          {...props}
          aria-label={ariaLabel}
          aria-labelledby={ariaLabel && !ariaLabelledBy ? "" : ariaLabelledBy}
          className={clsx("wd-menu-ui__content", className)}
          finalFocus={
            typeof finalFocus === "function"
              ? (interaction) => finalFocus(interaction || "unknown")
              : finalFocus
          }
          ref={ref}
        />
      </BaseMenu.Positioner>
    </BaseMenu.Portal>
  );
});
