import type { Ref } from "react";
import { forwardRef } from "react";

import { Popover } from "@base-ui/react/popover";
import { clsx } from "clsx";

import type { PopoverUIDescriptionProps } from "../popoverUI.types";

/**
 * PopoverContentUI 안에서 해당 보조 표면의 접근 가능한 설명으로 연결되는 보조 문구를 렌더링한다.
 *
 * PopoverDescriptionUI는 설명 문구, 도메인 도움말 또는 검증 정책을 결정하지 않는다.
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
