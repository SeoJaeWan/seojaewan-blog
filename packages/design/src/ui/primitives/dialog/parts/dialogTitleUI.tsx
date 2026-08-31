import { Dialog } from "@base-ui/react/dialog";
import { clsx } from "clsx";

import type { DialogUITitleProps } from "../dialogUI.types";

/**
 * DialogContentUI 안에서 해당 모달의 접근 가능한 이름을 제공하는 heading을 렌더링한다.
 *
 * DialogTitleUI는 제목 문구, heading 단계 또는 애플리케이션 정보 구조를 결정하지 않는다.
 */
export function DialogTitleUI({ className, ref, ...props }: DialogUITitleProps) {
  return <Dialog.Title {...props} className={clsx("wd-dialog-ui__title", className)} ref={ref} />;
}
