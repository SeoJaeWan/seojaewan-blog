import { Button as BaseButton } from "@base-ui/react/button";
import { clsx } from "clsx";

import type { ButtonUIProps } from "./buttonUI.types";

import "./buttonUI.css";

/**
 * 디자인 패키지의 시각 규칙과 접근성 기본값을 적용한 native button을 렌더링한다.
 *
 * ButtonUI는 활성화 뒤 실행할 애플리케이션 동작을 결정하지 않는다.
 */
export const ButtonUI = ({ className, type = "button", ...props }: ButtonUIProps) => (
  <BaseButton {...props} className={clsx("wd-button-ui", className)} type={type} />
);
