import type { CSSProperties } from "react";

import { clsx } from "clsx";

import { TaskbarPreviewUI } from "./taskbarPreviewUI";
import type { TaskHoverPanelUIProps } from "./taskbarUI.types";

import "./taskbarUI.css";

/** Taskbar group의 session preview cards를 responsive grid로 생산한다. */
export const TaskHoverPanelUI = ({
  className,
  items = [],
  onCloseItem,
  onSelectItem,
  style,
  ...props
}: TaskHoverPanelUIProps) => (
  <section
    {...props}
    className={clsx("wd-task-hover-panel-ui", className)}
    style={
      {
        ...style,
        "--wd-task-hover-panel-columns": Math.max(items.length, 1),
      } as CSSProperties
    }
  >
    {items.map((item) => (
      <TaskbarPreviewUI
        key={item.value}
        icon={item.icon}
        onClose={onCloseItem ? () => onCloseItem(item.value) : undefined}
        onSelect={() => onSelectItem?.(item.value)}
        preview={item.preview}
        title={item.label}
      />
    ))}
  </section>
);
