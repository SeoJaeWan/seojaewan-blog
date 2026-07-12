import type { ComponentPropsWithRef } from "react";

import { clsx } from "clsx";

/** TaskPanel surface root에 전달할 native div props. */
export type TaskPanelProps = ComponentPropsWithRef<"div">;

/**
 * taskbar 위에 뜨는 floating panel의 공통 glass surface를 렌더링한다.
 * 위치, 표시 상태와 transition lifecycle은 외부 container와 기능 계층이 담당한다.
 *
 * @param props.children panel 안에 표시할 실제 Start/Search/Hover/Context 콘텐츠
 * @param props.className panel surface에 추가할 className
 */
export const TaskPanel = ({ children, className, ...props }: TaskPanelProps) => (
  <div className={clsx("wb-task-panel", className)} {...props}>
    {children}
  </div>
);
