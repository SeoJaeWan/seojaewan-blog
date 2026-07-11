import type { ComponentPropsWithRef } from "react";

import { clsx } from "clsx";

/** TaskPanel의 open/closed 애니메이션 상태. */
export type TaskPanelState = "closed" | "open";

export interface TaskPanelProps extends ComponentPropsWithRef<"div"> {
  /** data-state로 노출되는 패널 상태. 기본값은 "open"이다. */
  state?: TaskPanelState;
}

/**
 * taskbar 위에 뜨는 floating panel의 공통 shell을 렌더링한다.
 * 시작/검색/hover/context panel이 같은 glass surface와 `data-state` 기반
 * task-up/task-down 애니메이션을 공유하도록 감싼다.
 *
 * @param props.children panel 안에 표시할 실제 Start/Search/Hover/Context 콘텐츠
 * @param props.state CSS 애니메이션에 노출할 open/closed 상태. 기본값은 "open"
 * @param props.className panel shell에 추가할 className
 */
export const TaskPanel = ({ children, className, state = "open", ...props }: TaskPanelProps) => (
  <div className={clsx("wb-task-panel", className)} data-state={state} {...props}>
    {children}
  </div>
);
