import { forwardRef } from "react";

import { ContextMenu as BaseContextMenu } from "@base-ui/react/context-menu";
import { clsx } from "clsx";

import type { ContextMenuUIContentProps } from "../../contextMenuUI.types";

/**
 * 문맥 메뉴 항목을 popup으로 표시하고 호출 지점 기준 배치가 필요할 때 사용한다.
 *
 * ContextMenuRootUI 안에서 ContextMenuTriggerUI의 짝으로 두고 항목을 자식으로 조합한다.
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
          className="wd-menu-ui__positioner wd-context-menu-ui__positioner"
          collisionPadding={collisionPadding}
          side={side}
          sideOffset={sideOffset}
        >
          <BaseContextMenu.Popup
            {...props}
            aria-label={ariaLabel}
            aria-labelledby={ariaLabel && !ariaLabelledBy ? "" : ariaLabelledBy}
            className={clsx("wd-menu-ui__content", "wd-context-menu-ui__content", className)}
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
