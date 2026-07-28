import type { ComponentPropsWithRef } from "react";

import { clsx } from "clsx";

export type TaskbarAppListUIProps = ComponentPropsWithRef<"div">;

/**
 * Taskbar 가운데에서 app/task button children을 한 줄로 배치하는 순수 layout이다.
 * 표시 항목 계산, session/pin 상태와 panel 조립은 외부 shell connector가 담당한다.
 *
 * @param props.children 정적인 TaskbarTaskButtonUI visual 목록
 * @param props.className app list root에 추가할 className
 */
export const TaskbarAppListUI = ({ children, className, ...props }: TaskbarAppListUIProps) => (
  <div className={clsx("wb-taskbar-app-list", className)} {...props}>
    {children}
  </div>
);
