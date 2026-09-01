import { clsx } from "clsx";

import { InputUI } from "../../primitives";
import type { TaskbarSearchUIProps } from "./taskbarUI.types";

import "./taskbarUI.css";

/**
 * Windows taskbar의 free-text search field를 InputUI 위에 표현한다.
 *
 * 검색 실행, result data와 panel open policy는 caller가 소유한다.
 */
export const TaskbarSearchUI = ({
  "aria-label": ariaLabel = "검색",
  className,
  placeholder = "검색",
  ...props
}: TaskbarSearchUIProps) => (
  <InputUI
    {...props}
    aria-label={ariaLabel}
    className={clsx("wd-taskbar-search-ui", className)}
    placeholder={placeholder}
    type="search"
  />
);
