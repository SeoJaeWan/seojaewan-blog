import { forwardRef } from "react";

import { ContextMenu as BaseContextMenu } from "@base-ui/react/context-menu";
import { clsx } from "clsx";

import type { ContextMenuUIContentProps } from "../contextMenuUI.types";

/**
 * context menu role과 pointer 기준 배치·portal 경계를 제공한다.
 * action의 제품 순서나 실행 의미는 결정하지 않는다.
 */
export const ContextMenuContentUI = forwardRef<HTMLDivElement, ContextMenuUIContentProps>(
  function ContextMenuContentUI(
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
      <BaseContextMenu.Portal container={portalContainer} keepMounted={keepMounted}>
        <BaseContextMenu.Positioner
          align={align}
          alignOffset={alignOffset}
          className="wd-menu-ui__positioner"
          collisionPadding={collisionPadding}
          side={side}
          sideOffset={sideOffset}
        >
          <BaseContextMenu.Popup
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
        </BaseContextMenu.Positioner>
      </BaseContextMenu.Portal>
    );
  },
);
