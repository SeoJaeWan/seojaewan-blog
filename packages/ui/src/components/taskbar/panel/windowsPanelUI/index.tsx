import { clsx } from "clsx";

import type { TaskPanelUIProps } from "../../../base/panel/taskPanelUI";
import { TaskPanelUI } from "../../../base/panel/taskPanelUI";
import type { TaskSearchInputUIProps } from "../../input/taskSearchInputUI";
import { TaskSearchInputUI } from "../../input/taskSearchInputUI";

/** WindowsPanelUI root에 전달할 panel props. 본문은 compound children으로 조합한다. */
export type WindowsPanelUIProps = Omit<TaskPanelUIProps, "aria-label" | "role">;

const WINDOWS_PANEL_ARIA_LABEL = "시작";

/**
 * WindowsPanelUI의 시작 panel 전용 검색 input을 렌더링한다.
 * panel search slot과 기본 검색 placeholder를 소유하고 native input 동작은 TaskSearchInputUI에 위임한다.
 *
 * @param props.placeholder 검색 input에 표시할 placeholder. 기본값은 "앱 및 문서 검색"
 */
const WindowsPanelUISearchInput = ({
  placeholder = "앱 및 문서 검색",
  ...props
}: TaskSearchInputUIProps) => (
  <div className="wb-windows-panel__search">
    <TaskSearchInputUI {...props} placeholder={placeholder} />
  </div>
);

/**
 * 작업 표시줄 시작 panel의 compound root를 렌더링한다.
 * panel의 접근성 role은 dialog로 고정하고 검색·본문 조합은 children에 위임한다.
 *
 * @param props.children SearchInput과 독립적인 panel view 등 panel 본문
 * @param props.className panel root에 추가할 className
 */
const WindowsPanelUIRoot = ({ children, className, ...props }: WindowsPanelUIProps) => (
  <TaskPanelUI
    {...props}
    aria-label={WINDOWS_PANEL_ARIA_LABEL}
    className={clsx("wb-windows-panel", className)}
    role="dialog"
  >
    {children}
  </TaskPanelUI>
);

/**
 * 작업 표시줄 시작 panel의 compound UI.
 * Root와 panel 전용 SearchInput layout adapter를 제공하고 본문 visual은 children으로 조합한다.
 */
export const WindowsPanelUI = Object.assign(WindowsPanelUIRoot, {
  SearchInput: WindowsPanelUISearchInput,
});
