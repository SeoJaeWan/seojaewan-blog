import type { ComponentPropsWithRef } from "react";

import { clsx } from "clsx";

export type TaskbarRootUIProps = ComponentPropsWithRef<"nav">;

/**
 * 하단 고정 taskbar의 glass surface와 내부 정렬 visual을 렌더링한다.
 * floating panel 위치 기준 ref는 외부 shell connector가 native ref prop으로 연결한다.
 *
 * @param props.children 시작 버튼, 검색, 앱 목록, 시계 등 taskbar 안에 배치할 항목
 * @param props.className taskbar root에 추가할 className
 */
export const TaskbarRootUI = ({ children, className, ...props }: TaskbarRootUIProps) => (
  <nav className={clsx("wb-taskbar-root", className)} {...props}>
    {children}
  </nav>
);
