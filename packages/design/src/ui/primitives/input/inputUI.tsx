import { Input as BaseInput } from "@base-ui/react/input";
import { clsx } from "clsx";

import type { InputUIProps } from "./inputUI.types";

import "./inputUI.css";

/**
 * 텍스트 입력과 접근 가능한 form label을 위한 스타일 적용 native input을 렌더링한다.
 *
 * InputUI는 검증, 제출 또는 애플리케이션 검색 상태를 소유하지 않는다.
 */
export const InputUI = ({ className, type = "text", ...props }: InputUIProps) => (
  <BaseInput {...props} className={clsx("wd-input-ui", className)} type={type} />
);
