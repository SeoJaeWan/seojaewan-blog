import type { ComponentPropsWithRef } from "react";

import { Button } from "@base-ui/react/button";
import { clsx } from "clsx";

import type { TaskbarApplicationId } from "../../../../headless/taskbar/index.js";
import chromeIconSrc from "../../../assets/taskbar/applications/chrome.png";
import fileExplorerIconSrc from "../../../assets/taskbar/applications/file-explorer.png";

import "./taskbarApplicationButton.css";

/** application 고유 표현을 제외한 native button 입력이다. */
export type TaskbarApplicationButtonProps = Omit<
  ComponentPropsWithRef<"button">,
  "aria-label" | "aria-pressed" | "children" | "dangerouslySetInnerHTML" | "onClick" | "type"
> &
  Readonly<{
    /** 화면 모드와 독립적인 application identity, label과 실행 상태 표현이다. */
    application: Readonly<{
      applicationId: TaskbarApplicationId;
      label: string;
      active: boolean;
      /** 비활성 상태에서도 실행 중 표시선을 보여 준다. 최소화된 Window도 실행 중이다. */
      running?: boolean;
    }>;
    /** 실제 pointer·keyboard activation을 선택한 application Action으로 변환한다. */
    onAction?: (applicationId: TaskbarApplicationId) => void;
  }>;

/**
 * Taskbar의 File Explorer 또는 Chrome 공통 앱 버튼을 렌더링한다.
 *
 * active·running 상태는 읽기 전용 표현이다. mobile Root와 desktop Group은 각자의 실행 callback을 연결하며,
 * 이 버튼은 mode 판정·Window 실행·Preview·Pin 정책을 소유하지 않는다.
 */
export const TaskbarApplicationButton = ({
  application,
  className,
  onAction,
  ...props
}: TaskbarApplicationButtonProps) => {
  const iconSrc =
    application.applicationId === "file-explorer" ? fileExplorerIconSrc : chromeIconSrc;

  return (
    <Button
      {...props}
      aria-label={application.label}
      aria-pressed={application.active}
      className={clsx("taskbar-application-button", className)}
      data-active={application.active ? "true" : undefined}
      data-running={application.active || application.running ? "true" : undefined}
      data-application-id={application.applicationId}
      onClick={() => onAction?.(application.applicationId)}
      type="button"
    >
      <img
        alt=""
        aria-hidden="true"
        className="taskbar-application-button__icon"
        draggable={false}
        src={iconSrc}
      />
      {application.active || application.running ? (
        <span aria-hidden="true" className="taskbar-application-button__indicator" />
      ) : null}
    </Button>
  );
};
