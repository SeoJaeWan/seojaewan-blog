import type { ComponentPropsWithRef } from "react";

import { clsx } from "clsx";

import type { TaskbarTimestampValue } from "../../../../headless/taskbar/index.js";

import "./taskbarTimestampUI.css";

/** Timestamp 고유 표시를 제외한 native div 속성이다. */
export type TaskbarTimestampUIProps = Omit<
  ComponentPropsWithRef<"div">,
  "children" | "dangerouslySetInnerHTML"
> &
  Readonly<{
    /** 현재 local 시간·날짜 또는 SSR/hydration 준비 전 표현이다. */
    value: TaskbarTimestampValue | null;
  }>;

/**
 * Taskbar의 현재 local 시간과 날짜를 읽기 전용 두 줄 text로 표시한다.
 *
 * timer와 형식 계산은 Timestamp headless controller가 소유한다. 준비 전에는 hydration과 같은
 * geometry를 유지하는 `aria-hidden` skeleton을 렌더링하며 interaction이나 live announce를 만들지 않는다.
 */
export const TaskbarTimestampUI = ({ className, value, ...props }: TaskbarTimestampUIProps) => (
  <div
    {...props}
    className={clsx("taskbar-timestamp", className)}
    data-status={value ? "ready" : "not-ready"}
  >
    {value ? (
      <>
        <span className="taskbar-timestamp__time">{value.time}</span>
        <span className="taskbar-timestamp__date">{value.date}</span>
      </>
    ) : (
      <span aria-hidden="true" className="taskbar-timestamp__skeleton">
        <span className="taskbar-timestamp__skeleton-line" />
        <span className="taskbar-timestamp__skeleton-line" />
      </span>
    )}
  </div>
);
