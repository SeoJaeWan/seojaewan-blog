import type { ComponentPropsWithRef } from "react";

import { clsx } from "clsx";

export interface TaskSearchInputProps extends Omit<
  ComponentPropsWithRef<"input">,
  "children" | "type"
> {
  /** input을 감싸는 root span에 추가할 className. */
  rootClassName?: string;
}

/**
 * taskbar/SearchPanel에서 공유하는 검색 input primitive.
 * text input과 검색 아이콘을 한 surface로 묶고 disabled 상태를 root data 속성으로 노출한다.
 *
 * @param props.rootClassName input wrapper에 추가할 className
 * @param props.className 실제 input에 추가할 className
 * @param props.disabled true이면 input을 비활성화하고 wrapper에 data-disabled를 노출한다
 * @param props.placeholder aria-label fallback으로도 쓰는 placeholder. 기본값은 "검색"
 */
export const TaskSearchInput = ({
  "aria-label": ariaLabel,
  "aria-labelledby": ariaLabelledBy,
  className,
  disabled = false,
  placeholder = "검색",
  ref,
  rootClassName,
  ...props
}: TaskSearchInputProps) => (
  <span
    className={clsx("wb-task-search-input", rootClassName)}
    data-disabled={disabled ? "true" : undefined}
  >
    <input
      ref={ref}
      aria-label={ariaLabel ?? (ariaLabelledBy ? undefined : placeholder)}
      aria-labelledby={ariaLabelledBy}
      className={clsx("wb-task-search-input__control", className)}
      disabled={disabled}
      placeholder={placeholder}
      type="text"
      {...props}
    />
    <span aria-hidden="true" className="wb-task-search-input__icon" />
  </span>
);
