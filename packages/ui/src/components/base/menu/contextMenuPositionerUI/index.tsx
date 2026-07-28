import type { ComponentPropsWithRef } from "react";

import { clsx } from "clsx";

export type ContextMenuPositionerUIProps = ComponentPropsWithRef<"div">;

/**
 * Context Menu visual을 전달받은 viewport inset에 고정하는 positioner를 렌더링한다.
 * 좌표 계산과 방향 전환은 외부 기능 계층이 style로 주입한다.
 *
 * @param props.children 고정 좌표에 표시할 context menu panel
 * @param props.className positioner root에 추가할 className
 * @param props.style left, top, right, bottom 등 외부에서 계산한 visual inset
 */
export const ContextMenuPositionerUI = ({
  children,
  className,
  ...props
}: ContextMenuPositionerUIProps) => (
  <div className={clsx("wb-context-menu-positioner", className)} {...props}>
    {children}
  </div>
);
