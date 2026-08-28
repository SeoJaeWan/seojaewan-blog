import type { Ref } from "react";
import { forwardRef } from "react";

import { Popover } from "@base-ui/react/popover";
import { clsx } from "clsx";

import type { PopoverUIContentProps } from "../popoverUI.types";

/**
 * PopoverTriggerUI를 기준으로 배치되는 non-modal supplementary surface를 portal에 렌더링한다.
 *
 * PopoverContentUI는 modal focus 격리나 애플리케이션 stacking 정책을 소유하지 않는다.
 */
export const PopoverContentUI = forwardRef(function PopoverContentUI(
  {
    align = "center",
    alignOffset,
    children,
    className,
    collisionPadding = 8,
    container,
    finalFocus,
    initialFocus,
    keepMounted,
    side = "bottom",
    sideOffset = 8,
    ...props
  }: PopoverUIContentProps,
  ref: Ref<HTMLDivElement>,
) {
  return (
    <Popover.Portal container={container} keepMounted={keepMounted}>
      <Popover.Positioner
        align={align}
        alignOffset={alignOffset}
        className="wd-popover-ui__positioner"
        collisionPadding={collisionPadding}
        side={side}
        sideOffset={sideOffset}
      >
        <Popover.Popup
          {...props}
          className={clsx("wd-popover-ui__content", className)}
          finalFocus={finalFocus}
          initialFocus={initialFocus}
          ref={ref}
        >
          {children}
        </Popover.Popup>
      </Popover.Positioner>
    </Popover.Portal>
  );
});
