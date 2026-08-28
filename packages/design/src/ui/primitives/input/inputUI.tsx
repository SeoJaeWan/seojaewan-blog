import { Input as BaseInput } from "@base-ui/react/input";
import { clsx } from "clsx";

import type { InputUIProps } from "./inputUI.types";

import "./inputUI.css";

/**
 * 자유 형식 텍스트 입력에는 InputUI를 사용하고, 제안 목록 선택에는 ComboboxUI를, 정해진 선택지에는 SelectUI를 사용한다.
 *
 * InputUI는 접근 가능한 form label을 소비하지만 검증, 제출, 선택지 또는 애플리케이션 검색 상태를 소유하지 않는다.
 */
export const InputUI = ({ className, type = "text", ...props }: InputUIProps) => (
  <BaseInput {...props} className={clsx("wd-input-ui", className)} type={type} />
);
