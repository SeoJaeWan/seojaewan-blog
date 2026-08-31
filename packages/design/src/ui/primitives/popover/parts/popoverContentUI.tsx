import { Popover } from "@base-ui/react/popover";
import { clsx } from "clsx";

import type { PopoverUIContentProps } from "../popoverUI.types";

/**
 * PopoverRootUI 안에서 Trigger를 기준으로 배치되는 비모달 보조 표면을 portal에 렌더링하고 Title, Description과 작업 제어 요소를 담는다.
 *
 * PopoverContentUI는 모달 초점 격리, 내부 콘텐츠 구성 또는 애플리케이션 쌓임 정책을 소유하지 않는다.
 */
export function PopoverContentUI({
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
  ref,
  ...props
}: PopoverUIContentProps) {
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
}
