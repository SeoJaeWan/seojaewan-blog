import type { Ref } from "react";
import { forwardRef } from "react";

import { Dialog } from "@base-ui/react/dialog";
import { clsx } from "clsx";

import type { DialogUIDescriptionProps } from "../dialogUI.types";

/**
 * 자신이 속한 DialogContentUI에 연결되는 supporting text를 렌더링한다.
 *
 * DialogDescriptionUI는 설명 문구나 도메인 도움말 정책을 결정하지 않는다.
 */
export const DialogDescriptionUI = forwardRef(function DialogDescriptionUI(
  { className, ...props }: DialogUIDescriptionProps,
  ref: Ref<HTMLParagraphElement>,
) {
  return (
    <Dialog.Description
      {...props}
      className={clsx("wd-dialog-ui__description", className)}
      ref={ref}
    />
  );
});
