import type { Ref } from "react";
import { forwardRef } from "react";

import { Dialog } from "@base-ui/react/dialog";
import { clsx } from "clsx";

import type { DialogUIDescriptionProps } from "../dialogUI.types";

/**
 * DialogContentUI 안에서 해당 모달의 접근 가능한 설명으로 연결되는 보조 문구를 렌더링한다.
 *
 * DialogDescriptionUI는 설명 문구, 도메인 도움말 또는 검증 정책을 결정하지 않는다.
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
