import type { ComponentPropsWithRef } from "react";

import { clsx } from "clsx";

import {
  createTaskbarSearchAction,
  createTaskbarWindowsAction,
  type TaskbarTimestampClock,
  useTaskbarRootController,
  useTaskbarTimestampController,
} from "../../../../headless/taskbar/index.js";
import { TaskbarApplicationButton } from "../items/index.js";
import { TaskbarSearch } from "../search/index.js";
import { TaskbarStartButton } from "../start/index.js";
import { TaskbarTimestamp } from "../timestamp/index.js";

import "./taskbarRoot.css";

/** Taskbar Root의 고정 제품 의미를 제외한 native nav 속성이다. */
export type TaskbarRootProps = Omit<
  ComponentPropsWithRef<"nav">,
  "aria-label" | "children" | "dangerouslySetInnerHTML"
> &
  Readonly<{
    /** panel 구현 전에도 Windows trigger의 selected 표현을 제어한다. */
    windowsSelected?: boolean;
    /** 제품 준비 상태에 따라 Windows trigger 입력을 막는다. */
    windowsDisabled?: boolean;
    /** panel 구현 전에도 Search trigger의 selected 표현을 제어한다. */
    searchSelected?: boolean;
    /** 제품 준비 상태에 따라 Search trigger 입력을 막는다. */
    searchDisabled?: boolean;
    /** 외부 query 소유자가 제어하는 검색어다. */
    searchValue?: string;
    /** 독립 입력 모드의 초기 검색어다. */
    defaultSearchValue?: string;
    /** 입력한 검색어를 소유자에게 전달한다. */
    onSearchValueChange?: (value: string) => void;
    /** 기본 system clock 대신 deterministic host가 선택적으로 주입할 Timestamp clock이다. */
    timestampClock?: TaskbarTimestampClock;
  }>;

/**
 * 공통 WindowState.mode를 소비해 화면 하단 Taskbar surface와 현재 단계의 실행 항목 영역을 렌더링한다.
 *
 * `HeadlessRuntimeProvider` 안에서 사용한다. desktop Windows trigger는 Root Action gateway에 연결하고
 * Search trigger와 함께 mobile에서는 숨긴다. Timestamp는 별도 controller의 local clock을 소비해
 * desktop/mobile에 모두 표시하며 실제 실행 항목은 해당 요소가 구현될 때 연결한다.
 */
export const TaskbarRoot = ({
  className,
  searchDisabled = false,
  searchValue,
  defaultSearchValue,
  onSearchValueChange,
  searchSelected = false,
  timestampClock,
  windowsDisabled = false,
  windowsSelected = false,
  ...props
}: TaskbarRootProps) => {
  const { actions, viewModel } = useTaskbarRootController();
  const timestamp = useTaskbarTimestampController(timestampClock);
  const mode = viewModel.status === "ready" ? viewModel.snapshot.mode : undefined;

  return (
    <nav
      {...props}
      aria-label="작업 표시줄"
      className={clsx("taskbar-root", className)}
      data-mode={mode}
      data-status={viewModel.status}
    >
      {mode === "desktop" ? (
        <div className="taskbar-root__items" data-taskbar-region="items">
          <TaskbarStartButton
            disabled={windowsDisabled}
            onAction={() => actions.execute(createTaskbarWindowsAction())}
            selected={windowsSelected}
          />
          <TaskbarSearch
            disabled={searchDisabled}
            value={searchValue}
            defaultValue={defaultSearchValue}
            onValueChange={onSearchValueChange}
            onAction={() => actions.execute(createTaskbarSearchAction())}
            selected={searchSelected}
          />
          <span
            aria-hidden="true"
            className="taskbar-root__desktop-applications"
            data-taskbar-region="desktop-applications"
          />
        </div>
      ) : null}
      {mode === "mobile" && viewModel.status === "ready" ? (
        <div
          className="taskbar-root__items taskbar-root__items--mobile"
          data-taskbar-region="mobile-applications"
        >
          {viewModel.snapshot.mobileView
            .filter((item) => item.kind === "application")
            .map((application) => (
              <TaskbarApplicationButton
                application={application}
                key={application.applicationId}
                onAction={actions.launchMobileApplication}
              />
            ))}
        </div>
      ) : null}
      {mode === "desktop" || mode === "mobile" ? (
        <TaskbarTimestamp value={timestamp.value} />
      ) : null}
    </nav>
  );
};
