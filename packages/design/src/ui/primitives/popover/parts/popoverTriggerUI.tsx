"use client";

import type { Ref } from "react";
import { forwardRef, useContext } from "react";

import { Popover } from "@base-ui/react/popover";
import { clsx } from "clsx";

import type { PopoverUITriggerProps } from "../popoverUI.types";
import { PopoverTriggerIdContext } from "./popoverTriggerIdContext";

/**
 * PopoverRootUI의 상태를 바꾸고 PopoverContentUI의 anchor가 되는 visible button을 렌더링한다.
 *
 * PopoverTriggerUI는 button이 나타내는 애플리케이션 동작의 의미를 결정하지 않는다.
 */
export const PopoverTriggerUI = forwardRef(function PopoverTriggerUI(
  { className, id, type = "button", ...props }: PopoverUITriggerProps,
  ref: Ref<HTMLButtonElement>,
) {
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
});
