import { Popover } from "@base-ui/react/popover";
import { clsx } from "clsx";

import type { PopoverUICloseProps } from "../popoverUI.types";

/**
 * PopoverRootUI의 Content 안에서 해당 보조 표면의 열림 상태를 닫는 button을 렌더링한다.
 *
 * PopoverCloseUI는 button의 접근 가능한 이름이나 닫은 뒤 실행할 비즈니스 결과와 탐색을 결정하지 않는다.
 */
export function PopoverCloseUI({ className, type = "button", ref, ...props }: PopoverUICloseProps) {
  return (
    <Popover.Close
      {...props}
      className={clsx("wd-popover-ui__close", className)}
      ref={ref}
      type={type}
    />
  );
}
