import { ContextMenuUI } from "../../primitives";
import type { TaskbarContextMenuUIProps } from "./taskbarUI.types";

import "./taskbarUI.css";

/** Taskbar target, recent tasks와 product-supplied action presentation을 production ContextMenu로 조합한다. */
export const TaskbarContextMenuUI = ({
  actions = [],
  label,
  onAction,
  onTaskSelect,
  tasks = [],
  tasksLabel = "작업",
  trigger,
}: TaskbarContextMenuUIProps) => (
  <ContextMenuUI.Root>
    <ContextMenuUI.Trigger render={trigger} />
    <ContextMenuUI.Content aria-label={label} className="wd-taskbar-context-menu-ui" side="top">
      {tasks.length > 0 ? (
        <>
          <p className="wd-taskbar-context-menu-ui__label">{tasksLabel}</p>
          {tasks.map((task) => (
            <ContextMenuUI.Item
              key={task.value}
              disabled={task.disabled}
              icon={task.icon}
              onClick={() => onTaskSelect?.(task.value)}
            >
              {task.label}
            </ContextMenuUI.Item>
          ))}
          {actions.length > 0 ? <ContextMenuUI.Separator /> : null}
        </>
      ) : null}
      {actions.map((action) => (
        <ContextMenuUI.Item
          key={action.value}
          disabled={action.disabled}
          icon={action.icon}
          onClick={() => onAction?.(action.value)}
          trailing={action.trailing}
          variant={action.variant}
        >
          {action.label}
        </ContextMenuUI.Item>
      ))}
    </ContextMenuUI.Content>
  </ContextMenuUI.Root>
);
