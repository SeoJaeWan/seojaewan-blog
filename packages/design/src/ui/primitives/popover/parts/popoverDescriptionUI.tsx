import type { Ref } from "react";
import { forwardRef } from "react";

import { Popover } from "@base-ui/react/popover";
import { clsx } from "clsx";

import type { PopoverUIDescriptionProps } from "../popoverUI.types";

/**
 * 자신이 속한 PopoverContentUI에 연결되는 supporting text를 렌더링한다.
 *
 * PopoverDescriptionUI는 설명 문구나 도메인 도움말 정책을 결정하지 않는다.
 */
export const PopoverDescriptionUI = forwardRef(function PopoverDescriptionUI(
  { className, ...props }: PopoverUIDescriptionProps,
  ref: Ref<HTMLParagraphElement>,
) {
  return (
    <Popover.Description
      {...props}
      className={clsx("wd-popover-ui__description", className)}
      ref={ref}
    />
  );
});
