import type { Ref } from "react";
import { forwardRef } from "react";

import { Popover } from "@base-ui/react/popover";
import { clsx } from "clsx";

import type { PopoverUICloseProps } from "../popoverUI.types";

/**
 * 자신이 속한 PopoverRootUI의 열림 상태를 닫는 button을 렌더링한다.
 *
 * PopoverCloseUI는 닫기 뒤 실행할 비즈니스 결과나 탐색을 결정하지 않는다.
 */
export const PopoverCloseUI = forwardRef(function PopoverCloseUI(
  { className, type = "button", ...props }: PopoverUICloseProps,
  ref: Ref<HTMLButtonElement>,
) {
  return (
    <Popover.Close
      {...props}
      className={clsx("wd-popover-ui__close", className)}
      ref={ref}
      type={type}
    />
  );
});
