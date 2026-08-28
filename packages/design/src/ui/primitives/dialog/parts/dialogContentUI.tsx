import type { Ref } from "react";
import { forwardRef } from "react";

import { Dialog } from "@base-ui/react/dialog";
import { clsx } from "clsx";

import type { DialogUIContentProps } from "../dialogUI.types";

/**
 * DialogPortalUI 안에서 Title, Description과 작업 제어 요소를 담는 모달 표면을 렌더링하고 페이지 뒤쪽과 초점을 격리한다.
 *
 * DialogContentUI는 내부 콘텐츠의 구성이나 비즈니스 작업을 완료 또는 취소할 수 있는지 결정하지 않는다.
 */
export const DialogContentUI = forwardRef(function DialogContentUI(
  { className, finalFocus, initialFocus, ...props }: DialogUIContentProps,
  ref: Ref<HTMLDivElement>,
) {
  return (
    <Dialog.Viewport className="wd-dialog-ui__viewport">
      <Dialog.Popup
        {...props}
        aria-modal="true"
        className={clsx("wd-dialog-ui__content", className)}
        finalFocus={finalFocus}
        initialFocus={initialFocus}
        ref={ref}
      />
    </Dialog.Viewport>
  );
});
