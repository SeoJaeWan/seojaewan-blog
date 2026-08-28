import type { Ref } from "react";
import { forwardRef } from "react";

import { Dialog } from "@base-ui/react/dialog";
import { clsx } from "clsx";

import type { DialogUIPortalProps } from "../dialogUI.types";

/**
 * DialogRootUI 안에서 Backdrop과 Content를 애플리케이션 콘텐츠 위의 portal에 함께 렌더링한다.
 *
 * DialogPortalUI는 제품 수준의 쌓임 순서, 화면 전환 또는 모달 콘텐츠 구성을 결정하지 않는다.
 */
export const DialogPortalUI = forwardRef(function DialogPortalUI(
  { className, ...props }: DialogUIPortalProps,
  ref: Ref<HTMLDivElement>,
) {
  return <Dialog.Portal {...props} className={clsx("wd-dialog-ui__portal", className)} ref={ref} />;
});
