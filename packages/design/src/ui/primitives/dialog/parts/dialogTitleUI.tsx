import type { Ref } from "react";
import { forwardRef } from "react";

import { Dialog } from "@base-ui/react/dialog";
import { clsx } from "clsx";

import type { DialogUITitleProps } from "../dialogUI.types";

/**
 * 자신이 속한 DialogContentUI의 접근 가능한 이름을 제공하는 heading을 렌더링한다.
 *
 * DialogTitleUI는 제목 문구나 애플리케이션 정보 구조를 결정하지 않는다.
 */
export const DialogTitleUI = forwardRef(function DialogTitleUI(
  { className, ...props }: DialogUITitleProps,
  ref: Ref<HTMLHeadingElement>,
) {
  return <Dialog.Title {...props} className={clsx("wd-dialog-ui__title", className)} ref={ref} />;
});
