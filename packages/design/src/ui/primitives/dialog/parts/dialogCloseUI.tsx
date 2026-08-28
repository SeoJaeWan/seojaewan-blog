import type { Ref } from "react";
import { forwardRef } from "react";

import { Dialog } from "@base-ui/react/dialog";
import { clsx } from "clsx";

import type { DialogUICloseProps } from "../dialogUI.types";

/**
 * 자신이 속한 DialogRootUI의 열림 상태를 닫는 button을 렌더링한다.
 *
 * DialogCloseUI는 닫기 뒤 실행할 비즈니스 결과나 탐색을 결정하지 않는다.
 */
export const DialogCloseUI = forwardRef(function DialogCloseUI(
  { className, type = "button", ...props }: DialogUICloseProps,
  ref: Ref<HTMLButtonElement>,
) {
  return (
    <Dialog.Close
      {...props}
      className={clsx("wd-dialog-ui__close", className)}
      ref={ref}
      type={type}
    />
  );
});
