import type { ComponentPropsWithRef, ReactNode } from "react";

import { Slot, Slottable } from "@radix-ui/react-slot";
import { clsx } from "clsx";

export interface IconButtonUIProps extends Omit<ComponentPropsWithRef<"button">, "aria-label"> {
  /** icon button의 필수 접근성 이름. */
  "aria-label": string;
  asChild?: boolean;
  icon: ReactNode;
  selected?: boolean;
  size?: "lg" | "md" | "sm";
}

/**
 * Windows shell에서 아이콘이 주 신호인 버튼을 렌더링한다.
 * taskbar, panel tile, window chrome action이 같은 size/selected/disabled 규칙을 쓰도록
 * `IconButtonUI`을 primitive로 둔다.
 *
 * @param props.aria-label 버튼의 접근성 이름
 * @param props.icon 버튼 안쪽에 표시할 시각 아이콘
 * @param props.size 버튼 크기 variant. 기본값은 "md"
 * @param props.selected true이면 aria-pressed와 selected visual을 켠다
 * @param props.asChild true이면 Radix Slot으로 자식 요소에 버튼 스타일을 합성한다
 */
export const IconButtonUI = ({
  "aria-label": ariaLabel,
  asChild = false,
  children,
  className,
  disabled = false,
  icon,
  selected = false,
  size = "md",
  type = "button",
  ...props
}: IconButtonUIProps) => {
  const Component = asChild ? Slot : "button";
  const componentProps = asChild
    ? { "aria-disabled": disabled || undefined, ...props }
    : { disabled, type, ...props };

  return (
    <Component
      aria-label={ariaLabel}
      aria-pressed={selected || undefined}
      className={clsx("wb-icon-button", `wb-icon-button--${size}`, className)}
      data-disabled={disabled ? "true" : undefined}
      data-selected={selected ? "true" : undefined}
      {...componentProps}
    >
      <span aria-hidden="true" className="wb-icon-button__icon">
        {icon}
      </span>
      {asChild ? <Slottable>{children}</Slottable> : children}
    </Component>
  );
};
