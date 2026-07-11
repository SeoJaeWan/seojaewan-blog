import type { ComponentPropsWithRef } from "react";

import { clsx } from "clsx";

export type TaskbarPanelLayerProps = ComponentPropsWithRef<"div">;

/**
 * Taskbar floating panel을 viewport 위에 표시할 수 있는 고정 visual layer를 렌더링한다.
 * portal 연결과 panel registry는 이 컴포넌트를 조립하는 외부 기능 계층이 결정한다.
 *
 * @param props.children layer 안에 정적으로 배치할 panel visual
 * @param props.className layer root에 추가할 className
 */
export const TaskbarPanelLayer = ({ children, className, ...props }: TaskbarPanelLayerProps) => (
  <div className={clsx("wb-taskbar-panel-layer", className)} {...props}>
    {children}
  </div>
);
