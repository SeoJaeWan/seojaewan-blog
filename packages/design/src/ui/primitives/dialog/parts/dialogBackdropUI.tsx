import type { Ref } from "react";
import { forwardRef } from "react";

import { Dialog } from "@base-ui/react/dialog";
import { clsx } from "clsx";

import type { DialogUIBackdropProps } from "../dialogUI.types";

/**
 * modal DialogContentUI 뒤의 visual layer를 렌더링한다.
 *
 * DialogBackdropUI는 outside dismissal 허용 여부나 product dimming 정책을 결정하지 않는다.
 */
export const DialogBackdropUI = forwardRef(function DialogBackdropUI(
  { className, ...props }: DialogUIBackdropProps,
  ref: Ref<HTMLDivElement>,
) {
  return (
    <Dialog.Backdrop {...props} className={clsx("wd-dialog-ui__backdrop", className)} ref={ref} />
  );
});
