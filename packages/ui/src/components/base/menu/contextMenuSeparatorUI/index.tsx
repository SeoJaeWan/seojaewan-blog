import type { ComponentPropsWithoutRef } from "react";

import { clsx } from "clsx";

export type ContextMenuSeparatorUIProps = Omit<
  ComponentPropsWithoutRef<"div">,
  "aria-orientation" | "children" | "role"
>;

/**
 * Context Menu의 action group을 시각적·의미적으로 구분하는 수평 separator다.
 * 클릭과 keyboard focus 대상이 아니며 고정된 separator semantic을 소유한다.
 *
 * @param props.className separator에 추가할 className
 */
export const ContextMenuSeparatorUI = ({ className, ...props }: ContextMenuSeparatorUIProps) => (
  <div
    {...props}
    aria-orientation="horizontal"
    className={clsx("wb-context-menu-separator", className)}
    role="separator"
  />
);
