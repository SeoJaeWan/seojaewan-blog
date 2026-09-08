import type { ComponentPropsWithRef } from "react";

import { clsx } from "clsx";

import {
  createTaskbarWindowsAction,
  useTaskbarRootController,
} from "../../../../headless/taskbar/index.js";
import { TaskbarStartButtonUI } from "../start/index.js";

import "./taskbarRootUI.css";

/** Taskbar Root의 고정 제품 의미를 제외한 native nav 속성이다. */
export type TaskbarRootUIProps = Omit<
  ComponentPropsWithRef<"nav">,
  "aria-label" | "children" | "dangerouslySetInnerHTML"
> &
  Readonly<{
    /** panel 구현 전에도 Windows trigger의 selected 표현을 제어한다. */
    windowsSelected?: boolean;
    /** 제품 준비 상태에 따라 Windows trigger 입력을 막는다. */
    windowsDisabled?: boolean;
  }>;

/**
 * 공통 WindowState.mode를 소비해 화면 하단 Taskbar surface와 현재 단계의 실행 항목 영역을 렌더링한다.
 *
 * `HeadlessRuntimeProvider` 안에서 사용한다. desktop Windows trigger는 Root Action gateway에 연결하고
 * mobile에서는 숨긴다. Search·Timestamp와 실제 실행 항목은 각 요소가 구현될 때 연결한다.
 */
export const TaskbarRootUI = ({
  className,
  windowsDisabled = false,
  windowsSelected = false,
  ...props
}: TaskbarRootUIProps) => {
  const { actions, viewModel } = useTaskbarRootController();
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
          <TaskbarStartButtonUI
            disabled={windowsDisabled}
            onAction={() => actions.execute(createTaskbarWindowsAction())}
            selected={windowsSelected}
          />
        </div>
      ) : null}
    </nav>
  );
};
