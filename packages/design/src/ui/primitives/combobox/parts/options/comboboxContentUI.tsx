"use client";

import { forwardRef } from "react";

import { Combobox as BaseCombobox } from "@base-ui/react/combobox";
import { clsx } from "clsx";

import type { ComboboxUIContentProps } from "../../comboboxUI.types";

/**
 * list와 empty 상태를 portal의 popup에 배치하는 options surface part다. 위치와 충돌 여백의 프로젝트 기본값을 적용한다.
 *
 * 선택지를 조회, 정렬 또는 변환하지 않으며 검색과 선택 상태도 소유하지 않는다.
 */
export const ComboboxContentUI = forwardRef<HTMLDivElement, ComboboxUIContentProps>(
  function ComboboxContentUI(
    {
      align = "start",
      alignOffset,
      className,
      collisionPadding = 8,
      keepMounted,
      portalContainer,
      side = "bottom",
      sideOffset = 4,
      ...props
    },
    ref,
  ) {
    return (
      <BaseCombobox.Portal container={portalContainer} keepMounted={keepMounted}>
        <BaseCombobox.Positioner
          align={align}
          alignOffset={alignOffset}
          className="wd-combobox-ui__positioner"
          collisionPadding={collisionPadding}
          side={side}
          sideOffset={sideOffset}
        >
          <BaseCombobox.Popup
            {...props}
            className={clsx("wd-combobox-ui__content", className)}
            ref={ref}
          />
        </BaseCombobox.Positioner>
      </BaseCombobox.Portal>
    );
  },
);
