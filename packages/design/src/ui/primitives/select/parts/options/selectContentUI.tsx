"use client";

import { Select as BaseSelect } from "@base-ui/react/select";
import { clsx } from "clsx";

import type { SelectUIContentProps } from "../../selectUI.types";

/**
 * 선택지 list를 portal의 popup에 배치하는 options surface part다. 위치와 충돌 여백의 프로젝트 기본값을 적용한다.
 *
 * 선택지를 조회, 정렬 또는 변환하지 않으며 현재 선택 상태도 소유하지 않는다.
 */
export function SelectContentUI({
  align = "start",
  alignOffset,
  className,
  collisionPadding = 8,
  portalContainer,
  side = "bottom",
  sideOffset = 4,
  ref,
  ...props
}: SelectUIContentProps) {
  return (
    <BaseSelect.Portal container={portalContainer}>
      <BaseSelect.Positioner
        align={align}
        alignItemWithTrigger={false}
        alignOffset={alignOffset}
        className="wd-select-ui__positioner"
        collisionPadding={collisionPadding}
        side={side}
        sideOffset={sideOffset}
      >
        <BaseSelect.Popup
          {...props}
          className={clsx("wd-select-ui__content", className)}
          ref={ref}
        />
      </BaseSelect.Positioner>
    </BaseSelect.Portal>
  );
}
