import type { ComponentPropsWithRef } from "react";

import { clsx } from "clsx";

import { useTaskbarRootController } from "../../../../headless/taskbar/index.js";

import "./taskbarRootUI.css";

/** Taskbar Root의 고정 제품 의미를 제외한 native nav 속성이다. */
export type TaskbarRootUIProps = Omit<
  ComponentPropsWithRef<"nav">,
  "aria-label" | "children" | "dangerouslySetInnerHTML"
>;

/**
 * 공통 WindowState.mode를 소비해 화면 하단 Taskbar surface와 현재 단계의 실행 항목 영역을 렌더링한다.
 *
 * `HeadlessRuntimeProvider` 안에서 사용한다. Windows·Search·Timestamp와 실제 실행 항목은 각 요소가
 * 구현되는 단계에서 이 Root에 연결되며, 준비 전에는 임의 mode나 가짜 항목을 표시하지 않는다.
 */
export const TaskbarRootUI = ({ className, ...props }: TaskbarRootUIProps) => {
  const { viewModel } = useTaskbarRootController();
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
        <div className="taskbar-root__items" data-taskbar-region="items" />
      ) : null}
    </nav>
  );
};
