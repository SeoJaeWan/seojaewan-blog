import type { Ref } from "react";
import { forwardRef } from "react";

import { Dialog } from "@base-ui/react/dialog";
import { clsx } from "clsx";

import type { DialogUIPortalProps } from "../dialogUI.types";

/**
 * DialogBackdropUI와 DialogContentUI를 애플리케이션 content 위의 portal에 렌더링한다.
 *
 * DialogPortalUI는 product 수준 stacking이나 routing 정책을 결정하지 않는다.
 */
export const DialogPortalUI = forwardRef(function DialogPortalUI(
  { className, ...props }: DialogUIPortalProps,
  ref: Ref<HTMLDivElement>,
) {
  return <Dialog.Portal {...props} className={clsx("wd-dialog-ui__portal", className)} ref={ref} />;
});
