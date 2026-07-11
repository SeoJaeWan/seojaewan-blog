import type { TaskbarIconButtonProps } from "../taskbarIconButton";
import { TaskbarIconButton } from "../taskbarIconButton";

export type TaskbarTaskButtonProps = TaskbarIconButtonProps;

/**
 * Taskbar app/task 버튼의 icon, 실행 상태, open/dragging visual을 렌더링한다.
 * hover timer, context menu와 floating panel 정책은 외부 ShellTaskButton이 담당한다.
 */
export const TaskbarTaskButton = (props: TaskbarTaskButtonProps) => (
  <TaskbarIconButton {...props} />
);
