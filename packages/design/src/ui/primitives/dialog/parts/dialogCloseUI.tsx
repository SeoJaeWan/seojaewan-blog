import type { Ref } from "react";
import { forwardRef } from "react";

import { Dialog } from "@base-ui/react/dialog";
import { clsx } from "clsx";

import type { DialogUICloseProps } from "../dialogUI.types";

/**
 * DialogRootUI의 Content 안에서 해당 모달의 열림 상태를 닫는 button을 렌더링한다.
 *
 * DialogCloseUI는 button의 접근 가능한 이름이나 닫은 뒤 실행할 비즈니스 결과와 탐색을 결정하지 않는다.
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
