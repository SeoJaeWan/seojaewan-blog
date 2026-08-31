"use client";

import { useContext } from "react";

import { Popover } from "@base-ui/react/popover";
import { clsx } from "clsx";

import { PopoverTriggerIdContext } from "../popoverTriggerIdContext";
import type { PopoverUITriggerProps } from "../popoverUI.types";

/**
 * PopoverRootUI 안에서 Content의 기준 요소가 되고 열림 상태를 바꾸는 화면에 보이는 button을 렌더링한다.
 *
 * PopoverTriggerUI는 button의 접근 가능한 이름이나 열린 뒤 수행할 비즈니스 동작을 결정하지 않는다.
 */
export function PopoverTriggerUI({
  className,
  id,
  type = "button",
  ref,
  ...props
}: PopoverUITriggerProps) {
  const triggerId = useContext(PopoverTriggerIdContext);

  return (
    <Popover.Trigger
      {...props}
      className={clsx("wd-popover-ui__trigger", className)}
      id={triggerId ?? id}
      ref={ref}
      type={type}
    />
  );
}
