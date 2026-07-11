import type { ComponentPropsWithRef } from "react";

import { clsx } from "clsx";

export type ContextMenuPanelProps = ComponentPropsWithRef<"div">;

/**
 * 커서 위치에 뜨는 컨텍스트 메뉴의 row 묶음을 렌더링한다.
 * 원본 LeftPanel처럼 `ContextMenuButton` row들이 들어가는 메뉴 본문이며,
 * 위치 보정과 화면 mount는 이 컴포넌트를 조립하는 외부 기능 계층이 처리한다.
 *
 * @param props.children 메뉴 안에 표시할 action row 또는 sub panel trigger row
 * @param props.className 메뉴 panel surface에 추가할 className
 */
export const ContextMenuPanel = ({ children, className, ...props }: ContextMenuPanelProps) => (
  <div className={clsx("wb-context-menu-panel", className)} role="menu" {...props}>
    {children}
  </div>
);
