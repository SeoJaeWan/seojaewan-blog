import type { TaskbarIconButtonUIProps } from "../taskbarIconButtonUI";
import { TaskbarIconButtonUI } from "../taskbarIconButtonUI";

export type TaskbarTaskButtonUIProps = TaskbarIconButtonUIProps;

/**
 * Taskbar app/task 버튼의 icon, 실행 상태, open/dragging visual을 렌더링한다.
 * hover timer, context menu와 floating panel 정책은 외부 ShellTaskButton이 담당한다.
 */
export const TaskbarTaskButtonUI = (props: TaskbarTaskButtonUIProps) => (
  <TaskbarIconButtonUI {...props} />
);
