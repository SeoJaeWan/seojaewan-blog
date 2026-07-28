import type { ComponentPropsWithRef, ReactNode } from "react";

import { ChevronRight16Regular } from "@fluentui/react-icons";
import { Slot, Slottable } from "@radix-ui/react-slot";
import { clsx } from "clsx";

export interface ContextMenuButtonUIProps extends Omit<
  ComponentPropsWithRef<"button">,
  "aria-label"
> {
  asChild?: boolean;
  /** null이면 아이콘 slot 없이 렌더 (원본 정렬 서브 메뉴 row) */
  icon: ReactNode;
  label: string;
  selected?: boolean;
  /** true이면 하위 메뉴가 있음을 나타내는 chevron을 trailing slot에 표시한다. */
  submenuIndicator?: boolean;
  /** 라벨 오른쪽 끝 slot — 서브 메뉴 화살표 등 (원본 justify-between chevron) */
  trailing?: ReactNode;
}

/**
 * 컨텍스트 메뉴 안의 action row 버튼을 렌더링한다.
 * 원본 LeftPanel row처럼 icon, label, trailing slot을 한 줄에 배치하고,
 * 정렬/보기 메뉴처럼 icon이 없는 row는 `icon={null}`로 같은 레이아웃 안에서 처리한다.
 *
 * @param props.icon 왼쪽 icon slot. null이면 icon 칸을 렌더링하지 않는다
 * @param props.label row label이자 aria-label로 쓰는 action 이름
 * @param props.trailing 오른쪽 끝에 표시할 chevron, shortcut 등 보조 slot
 * @param props.submenuIndicator true이면 trailing slot에 하위 메뉴 chevron을 표시
 * @param props.selected true이면 aria-pressed와 selected visual을 켠다
 * @param props.asChild true이면 Radix Slot으로 자식 요소에 row 스타일을 합성한다
 */
export const ContextMenuButtonUI = ({
  asChild = false,
  children,
  className,
  disabled = false,
  icon,
  label,
  role,
  selected = false,
  submenuIndicator = false,
  trailing,
  type = "button",
  ...props
}: ContextMenuButtonUIProps) => {
  const Component = asChild ? Slot : "button";
  const selectedAsMenuChoice = role === "menuitemcheckbox" || role === "menuitemradio";
  const resolvedTrailing = trailing ?? (submenuIndicator ? <ChevronRight16Regular /> : undefined);
  const componentProps = asChild
    ? { "aria-disabled": disabled || undefined, ...props }
    : { disabled, type, ...props };

  return (
    <Component
      aria-checked={selectedAsMenuChoice ? selected : undefined}
      aria-label={label}
      aria-pressed={!selectedAsMenuChoice && selected ? true : undefined}
      className={clsx("wb-context-menu-button", className)}
      data-disabled={disabled ? "true" : undefined}
      data-selected={selected ? "true" : undefined}
      role={role}
      {...componentProps}
    >
      {icon !== null && (
        <span aria-hidden="true" className="wb-context-menu-button__icon">
          {icon}
        </span>
      )}
      {asChild ? <Slottable>{children}</Slottable> : children}
      <span className="wb-context-menu-button__label">{label}</span>
      {resolvedTrailing !== undefined && (
        <span aria-hidden="true" className="wb-context-menu-button__trailing">
          {resolvedTrailing}
        </span>
      )}
    </Component>
  );
};
