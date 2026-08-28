import { clsx } from "clsx";

import { ButtonUI } from "../button";
import type { IconButtonUIProps } from "./iconButtonUI.types";

import "./iconButtonUI.css";

/**
 * 필수 label로 접근 가능한 이름을 제공하는 아이콘 전용 button을 렌더링한다.
 *
 * IconButtonUI는 label을 추론하거나 실행할 애플리케이션 동작을 결정하지 않는다.
 */
export const IconButtonUI = ({ className, icon, label, ...props }: IconButtonUIProps) => (
  <ButtonUI {...props} aria-label={label} className={clsx("wd-icon-button-ui", className)}>
    <span aria-hidden="true" className="wd-icon-button-ui__icon">
      {icon}
    </span>
  </ButtonUI>
);
