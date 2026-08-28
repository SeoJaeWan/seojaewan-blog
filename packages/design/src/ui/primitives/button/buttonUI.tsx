import { Button as BaseButton } from "@base-ui/react/button";
import { clsx } from "clsx";

import type { ButtonUIProps } from "./buttonUI.types";

import "./buttonUI.css";

/**
 * 텍스트나 콘텐츠로 목적을 드러내는 일반 작업에는 ButtonUI를 사용한다.
 *
 * 아이콘만 보이는 작업의 접근 가능한 이름은 IconButtonUI가 맡으며, ButtonUI는 활성화 뒤 실행할 애플리케이션 동작을 결정하지 않는다.
 */
export const ButtonUI = ({ className, type = "button", ...props }: ButtonUIProps) => (
  <BaseButton {...props} className={clsx("wd-button-ui", className)} type={type} />
);
