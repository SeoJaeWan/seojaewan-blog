import type { ReactNode } from "react";

import { clsx } from "clsx";

import fileIconSrc from "../../../../assets/file.png";
import { ContextMenuButtonUI } from "../../../base/button/contextMenuButtonUI";
import type { TaskPanelUIProps } from "../../../base/panel/taskPanelUI";
import { TaskPanelUI } from "../../../base/panel/taskPanelUI";

/**
 * TaskbarContextMenuUI 작업 섹션에 표시할 task row.
 */
export interface TaskbarContextMenuTask {
  /** 작업 row 왼쪽 icon slot. 없으면 기본 file icon을 사용한다. */
  icon?: ReactNode;
  /** task 선택 payload와 list key로 쓰는 id. */
  id: string;
  /** context menu row label. */
  title: string;
}

export interface TaskbarContextMenuUIProps extends Omit<TaskPanelUIProps, "children"> {
  /** 작업 섹션 아래에 렌더할 추가 ContextMenuButtonUI action row들. */
  children?: ReactNode;
  /** 작업 row 클릭 시 선택된 task를 전달한다. */
  onSelectTask?: (task: TaskbarContextMenuTask) => void;
  /** 작업 섹션에 표시할 task 목록. 기본값은 빈 배열이다. */
  tasks?: TaskbarContextMenuTask[];
  /** 작업 섹션 label. 기본값은 "작업"이다. */
  tasksLabel?: string;
}

// 원본 findFileIcon()은 항상 file 아이콘을 반환 — icon 미지정 작업 항목의 기본값
const defaultFileIcon = <img alt="" draggable={false} src={fileIconSrc} />;

/**
 * taskbar app 우클릭 floating context menu (원본 TaskbarLeftPanel).
 * 상단 작업 섹션과 하단 고정/닫기 action row들을 같은 TaskPanelUI surface에 배치한다.
 *
 * @param props.tasks 상단 작업 섹션에 표시할 최근/고정 task row 목록
 * @param props.tasksLabel 작업 섹션 제목. 기본값은 "작업"
 * @param props.onSelectTask 작업 row 클릭을 앱의 파일/항목 열기로 위임하는 callback
 * @param props.children 작업 섹션 아래에 표시할 고정/닫기 action row들
 * @param props.state TaskPanelUI open/closed 애니메이션 상태
 */
export const TaskbarContextMenuUI = ({
  children,
  className,
  onSelectTask,
  tasks = [],
  tasksLabel = "작업",
  ...props
}: TaskbarContextMenuUIProps) => (
  <TaskPanelUI className={clsx("wb-taskbar-context-menu", className)} {...props}>
    {tasks.length >= 1 ? (
      <>
        <p className="wb-taskbar-context-menu__tasks-label">{tasksLabel}</p>
        <ul className="wb-taskbar-context-menu__tasks">
          {tasks.map((task) => (
            <li key={task.id} className="wb-taskbar-context-menu__task">
              <ContextMenuButtonUI
                icon={task.icon ?? defaultFileIcon}
                label={task.title}
                onClick={() => onSelectTask?.(task)}
              />
            </li>
          ))}
        </ul>
      </>
    ) : null}
    <div className="wb-taskbar-context-menu__actions">{children}</div>
  </TaskPanelUI>
);
