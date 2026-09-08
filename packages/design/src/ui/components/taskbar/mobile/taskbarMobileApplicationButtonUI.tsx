import type { ComponentPropsWithRef } from "react";

import { Button } from "@base-ui/react/button";
import { clsx } from "clsx";

import type {
  MobileTaskbarApplicationView,
  TaskbarApplicationId,
} from "../../../../headless/taskbar/index.js";
import chromeIconSrc from "../../../assets/taskbar/mobile/chrome.png";
import fileExplorerIconSrc from "../../../assets/taskbar/mobile/file-explorer.png";

import "./taskbarMobileApplicationButtonUI.css";

/** mobile application 고유 표현을 제외한 native button 입력이다. */
export type TaskbarMobileApplicationButtonUIProps = Omit<
  ComponentPropsWithRef<"button">,
  "aria-label" | "aria-pressed" | "children" | "dangerouslySetInnerHTML" | "onClick" | "type"
> &
  Readonly<{
    /** selector가 파생한 application identity, label과 현재 active 표현이다. */
    application: MobileTaskbarApplicationView;
    /** 실제 pointer·keyboard activation을 선택한 application Action으로 변환한다. */
    onAction?: (applicationId: TaskbarApplicationId) => void;
  }>;

/**
 * mobile Taskbar의 고정 File Explorer 또는 Chrome 진입 버튼을 렌더링한다.
 *
 * active 상태는 읽기 전용 표현이며 같은 application의 no-op과 다른 application 교체 정책은
 * headless Window 실행 경로가 소유한다.
 */
export const TaskbarMobileApplicationButtonUI = ({
  application,
  className,
  onAction,
  ...props
}: TaskbarMobileApplicationButtonUIProps) => {
  const iconSrc =
    application.applicationId === "file-explorer" ? fileExplorerIconSrc : chromeIconSrc;

  return (
    <Button
      {...props}
      aria-label={application.label}
      aria-pressed={application.active}
      className={clsx("taskbar-mobile-application-button", className)}
      data-active={application.active ? "true" : undefined}
      data-application-id={application.applicationId}
      onClick={() => onAction?.(application.applicationId)}
      type="button"
    >
      <img
        alt=""
        aria-hidden="true"
        className="taskbar-mobile-application-button__icon"
        draggable={false}
        src={iconSrc}
      />
    </Button>
  );
};
