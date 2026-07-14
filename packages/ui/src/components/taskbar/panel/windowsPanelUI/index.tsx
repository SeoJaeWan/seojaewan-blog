import { clsx } from "clsx";

import type { TaskPanelProps } from "../../../base/panel/taskPanel";
import { TaskPanel } from "../../../base/panel/taskPanel";
import type { TaskSearchInputProps } from "../../input/taskSearchInput";
import { TaskSearchInput } from "../../input/taskSearchInput";
import type { TaskSearchResultViewProps } from "../../view/taskSearchResultView";
import { TaskSearchResultView } from "../../view/taskSearchResultView";
import type { WindowsPanelViewMode } from "../../view/windowsPanelView";
import { WindowsPanelView } from "../../view/windowsPanelView";

/** contextmenu 이벤트가 발생한 WindowsPanelUI 목록 영역. */
export type WindowsPanelItemSource = WindowsPanelViewMode | "search";

/** WindowsPanelUI root에 전달할 panel props. 본문은 compound children으로 조합한다. */
export type WindowsPanelUIProps = Omit<TaskPanelProps, "aria-label" | "role">;

const WINDOWS_PANEL_ARIA_LABEL = "시작";

/**
 * WindowsPanelUI의 시작 panel 전용 검색 input을 렌더링한다.
 * panel search slot과 기본 검색 placeholder를 소유하고 native input 동작은 TaskSearchInput에 위임한다.
 *
 * @param props.placeholder 검색 input에 표시할 placeholder. 기본값은 "앱 및 문서 검색"
 */
const WindowsPanelUISearchInput = ({
  placeholder = "앱 및 문서 검색",
  ...props
}: TaskSearchInputProps) => (
  <div className="wb-windows-panel__search">
    <TaskSearchInput {...props} placeholder={placeholder} />
  </div>
);

/** WindowsPanelUI의 검색 결과 content slot과 panel 내부 위치를 렌더링한다. */
const WindowsPanelUISearchResults = (props: TaskSearchResultViewProps) => (
  <div className="wb-windows-panel__search-results">
    <TaskSearchResultView {...props} />
  </div>
);

/**
 * 작업 표시줄 시작 panel의 compound root를 렌더링한다.
 * panel의 접근성 role은 dialog로 고정하고 검색·본문 조합은 children에 위임한다.
 *
 * @param props.children SearchInput과 SearchResults/View 등 panel 본문
 * @param props.className panel root에 추가할 className
 */
const WindowsPanelUIRoot = ({ children, className, ...props }: WindowsPanelUIProps) => (
  <TaskPanel
    {...props}
    aria-label={WINDOWS_PANEL_ARIA_LABEL}
    className={clsx("wb-windows-panel", className)}
    role="dialog"
  >
    {children}
  </TaskPanel>
);

/**
 * 작업 표시줄 시작 panel의 compound UI.
 * SearchInput/SearchResults는 panel layout adapter이고 View는 공유 visual의 namespaced alias다.
 */
export const WindowsPanelUI = Object.assign(WindowsPanelUIRoot, {
  SearchInput: WindowsPanelUISearchInput,
  SearchResults: WindowsPanelUISearchResults,
  View: WindowsPanelView,
});
