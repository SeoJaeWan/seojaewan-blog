import type { Ref } from "react";
import { forwardRef } from "react";

import { Popover } from "@base-ui/react/popover";
import { clsx } from "clsx";

import type { PopoverUITitleProps } from "../popoverUI.types";

/**
 * PopoverContentUI 안에서 해당 보조 표면의 접근 가능한 이름을 제공하는 heading을 렌더링한다.
 *
 * PopoverTitleUI는 제목 문구, heading 단계 또는 애플리케이션 정보 구조를 결정하지 않는다.
 */
export const PopoverTitleUI = forwardRef(function PopoverTitleUI(
  { className, ...props }: PopoverUITitleProps,
  ref: Ref<HTMLHeadingElement>,
) {
  return <Popover.Title {...props} className={clsx("wd-popover-ui__title", className)} ref={ref} />;
});
