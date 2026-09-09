import type { ComponentPropsWithRef, KeyboardEvent } from "react";
import { useEffect, useRef } from "react";

import { clsx } from "clsx";

import {
  type TaskbarTimestampClock,
  useTaskbarRootController,
  useTaskbarTimestampController,
} from "../../../../headless/taskbar/index.js";
import { TaskbarApplicationButton } from "../items/index.js";
import { useTaskbarPanelsConnection } from "../panels/index.js";
import { TaskbarSearchPanel } from "../search/index.js";
import { TaskbarStart } from "../start/index.js";
import { TaskbarTimestamp } from "../timestamp/index.js";

import "./taskbarRoot.css";

/**
 * 실제 Search input의 Space 입력은 보존하고 Base UI Trigger의 keyboard activation만 건너뛴다.
 *
 * native input 기본 동작과 IME event는 막지 않으며 다른 key의 widget 처리는 Base UI에 맡긴다.
 */
const preserveTaskbarSearchSpace = (event: KeyboardEvent<HTMLInputElement>): void => {
  if (event.key !== " ") return;
  (
    event as KeyboardEvent<HTMLInputElement> &
      Readonly<{ preventBaseUIHandler?: () => void }>
  ).preventBaseUIHandler?.();
};

/** Taskbar Root의 고정 제품 의미를 제외한 native nav 속성이다. */
export type TaskbarRootProps = Omit<
  ComponentPropsWithRef<"nav">,
  "aria-label" | "children" | "dangerouslySetInnerHTML"
> &
  Readonly<{
    /** 제품 준비 상태에 따라 Windows trigger 입력을 막는다. */
    windowsDisabled?: boolean;
    /** 제품 준비 상태에 따라 Search trigger 입력을 막는다. */
    searchDisabled?: boolean;
    /** 기본 system clock 대신 deterministic host가 선택적으로 주입할 Timestamp clock이다. */
    timestampClock?: TaskbarTimestampClock;
  }>;

/**
 * 공통 WindowState.mode를 소비해 화면 하단 Taskbar surface와 현재 단계의 실행 항목 영역을 렌더링한다.
 *
 * `HeadlessRuntimeProvider` 안에서 사용한다. desktop에서는 하나의 primary panel connection을 실제
 * Start와 Search 제품 part에 나눠 전달하고, mobile 전환에서는 대기 중인 desktop panel까지 정리한다.
 * Timestamp와 mobile application은 기존 controller 경계를 그대로 소비한다.
 */
export const TaskbarRoot = ({
  className,
  searchDisabled = false,
  timestampClock,
  windowsDisabled = false,
  ...props
}: TaskbarRootProps) => {
  const { actions, viewModel } = useTaskbarRootController();
  const panels = useTaskbarPanelsConnection();
  const timestamp = useTaskbarTimestampController(timestampClock);
  const mode = viewModel.status === "ready" ? viewModel.snapshot.mode : undefined;
  const previousModeRef = useRef<typeof mode>(undefined);

  useEffect(() => {
    const previousMode = previousModeRef.current;
    previousModeRef.current = mode;
    if (mode === "mobile" && previousMode !== "mobile") panels.dismissForMobile();
  }, [mode, panels]);

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
          <TaskbarStart
            buttonProps={{ disabled: windowsDisabled }}
            connection={panels.start}
          />
          <TaskbarSearchPanel
            connection={panels.search}
            disabled={searchDisabled}
            onKeyDown={preserveTaskbarSearchSpace}
          >
            {null}
          </TaskbarSearchPanel>
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
