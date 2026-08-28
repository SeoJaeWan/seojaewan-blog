import type { Ref } from "react";
import { forwardRef } from "react";

import { Dialog } from "@base-ui/react/dialog";
import { clsx } from "clsx";

import type { DialogUIBackdropProps } from "../dialogUI.types";

/**
 * DialogPortalUI 안에서 Content 뒤에 놓이는 모달 시각 계층을 렌더링한다.
 *
 * DialogBackdropUI는 바깥 영역 상호작용으로 닫을지 여부나 제품 수준의 흐림 정책을 결정하지 않는다.
 */
export const DialogBackdropUI = forwardRef(function DialogBackdropUI(
  { className, ...props }: DialogUIBackdropProps,
  ref: Ref<HTMLDivElement>,
) {
  return (
    <Dialog.Backdrop {...props} className={clsx("wd-dialog-ui__backdrop", className)} ref={ref} />
  );
});
