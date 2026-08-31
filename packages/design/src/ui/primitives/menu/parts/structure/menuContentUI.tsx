import { Menu as BaseMenu } from "@base-ui/react/menu";
import { clsx } from "clsx";

import type { MenuUIContentProps } from "../../menuUI.types";

/**
 * 메뉴 항목을 popup으로 표시하고 배치·portal 경계가 필요할 때 사용한다.
 *
 * MenuRootUI 안에서 MenuTriggerUI의 짝으로 두고 항목 part를 자식으로 조합한다.
 */
export function MenuContentUI({
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
  ref,
  ...props
}: MenuUIContentProps) {
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
}
