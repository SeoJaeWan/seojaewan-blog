import { clsx } from "clsx";

import { ButtonUI } from "../button";
import type { IconButtonUIProps } from "./iconButtonUI.types";

import "./iconButtonUI.css";

/**
 * 공간이 제한되어 아이콘만 보이는 작업에는 필수 label로 접근 가능한 이름을 제공하는 IconButtonUI를 사용한다.
 *
 * 텍스트나 콘텐츠로 목적을 드러내는 작업은 ButtonUI가 맡으며, IconButtonUI는 label을 추론하거나 실행할 애플리케이션 동작을 결정하지 않는다.
 */
export const IconButtonUI = ({ className, icon, label, ...props }: IconButtonUIProps) => (
  <ButtonUI {...props} aria-label={label} className={clsx("wd-icon-button-ui", className)}>
    <span aria-hidden="true" className="wd-icon-button-ui__icon">
      {icon}
    </span>
  </ButtonUI>
);
