import type { CSSProperties, ReactNode } from "react";

import { Dismiss16Regular } from "@fluentui/react-icons";
import { clsx } from "clsx";

import fileIconSrc from "../../../../assets/file.png";
import type { TaskPanelProps } from "../../../base/panel/taskPanel";
import { TaskPanel } from "../../../base/panel/taskPanel";

/**
 * TaskHoverPanel이 하나의 열린 세션 preview thumbnail로 렌더할 항목.
 */
export interface TaskHoverPanelItem {
  /** thumbnail titlebar 왼쪽 icon slot. */
  icon?: ReactNode;
  /** 세션 선택/닫기 payload로 쓰는 id. */
  id: string;
  /** thumbnail 본문 preview slot. */
  preview?: ReactNode;
  /** thumbnail titlebar와 close aria-label에 쓰는 제목. */
  title: string;
}

export interface TaskHoverPanelProps extends Omit<TaskPanelProps, "children"> {
  /** hover panel에 표시할 세션 thumbnail 목록. 기본값은 빈 배열이다. */
  items?: TaskHoverPanelItem[];
  /** thumbnail 닫기 버튼 클릭 시 해당 item을 전달한다. */
  onCloseItem?: (item: TaskHoverPanelItem) => void;
  /** thumbnail 본문 선택 버튼 클릭 시 해당 item을 전달한다. */
  onSelectItem?: (item: TaskHoverPanelItem) => void;
}

// 원본은 file이면 findFileIcon(), folder면 findCategoryIcon() — icon 미지정 항목의 기본값
const defaultFileIcon = <img alt="" draggable={false} src={fileIconSrc} />;

/**
 * taskbar app hover preview panel (원본 TaskHoverPanel).
 * 열린 세션들을 thumbnail grid로 보여주고 선택/닫기 액션을 앱에 위임한다.
 *
 * @param props.items hover panel에 표시할 열린 세션 thumbnail 목록
 * @param props.onSelectItem thumbnail 본문 선택을 앱의 세션 활성화로 위임하는 callback
 * @param props.onCloseItem thumbnail 닫기 버튼을 앱의 세션 닫기로 위임하는 callback
 * @param props.state TaskPanel open/closed 애니메이션 상태
 * @param props.className panel root에 추가할 className
 */
export const TaskHoverPanel = ({
  className,
  items = [],
  onCloseItem,
  onSelectItem,
  style,
  ...props
}: TaskHoverPanelProps) => (
  <TaskPanel
    className={clsx("wb-task-hover-panel", className)}
    style={
      {
        "--wb-task-hover-panel-columns": items.length || 1,
        ...style,
      } as CSSProperties
    }
    {...props}
  >
    {items.map((item) => (
      <div key={item.id} className="wb-task-hover-panel__thumbnail">
        <button
          aria-label={item.title}
          className="wb-task-hover-panel__select"
          onClick={() => onSelectItem?.(item)}
          type="button"
        />
        <div className="wb-task-hover-panel__titlebar">
          <span aria-hidden="true" className="wb-task-hover-panel__titlebar-icon">
            {item.icon ?? defaultFileIcon}
          </span>
          <span className="wb-task-hover-panel__title">{item.title}</span>
          <span className="wb-task-hover-panel__close-spacer" />
        </div>
        <button
          aria-label={`${item.title} 닫기`}
          className="wb-task-hover-panel__close"
          onClick={() => onCloseItem?.(item)}
          type="button"
        >
          <Dismiss16Regular aria-hidden="true" />
        </button>
        <div className="wb-task-hover-panel__preview">{item.preview}</div>
      </div>
    ))}
  </TaskPanel>
);
