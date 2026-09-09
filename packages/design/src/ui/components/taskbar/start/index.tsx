import type { ComponentPropsWithRef } from "react";

import { Button } from "@base-ui/react/button";
import { clsx } from "clsx";

import windowsLogoSrc from "../../../assets/taskbar/windows.svg";

import "./taskbarStartButton.css";

/** 시작 버튼의 고정 제품 의미를 제외한 native button 입력이다. */
export type TaskbarStartButtonProps = Omit<
  ComponentPropsWithRef<"button">,
  "aria-label" | "aria-pressed" | "children" | "dangerouslySetInnerHTML" | "onClick" | "type"
> &
  Readonly<{
    /** panel 구현과 독립적으로 Windows trigger의 선택 표현을 제어한다. */
    selected?: boolean;
    /** 실제 pointer·keyboard activation을 제품 Windows Action으로 변환한다. */
    onAction?: () => void;
  }>;

/**
 * Windows logo와 시작 접근성 이름을 가진 Taskbar trigger를 렌더링한다.
 *
 * panel 관계와 open 상태 전이는 소유하지 않으며 `selected`는 현재 표현 입력으로만 사용한다.
 */
export const TaskbarStartButton = ({
  className,
  onAction,
  selected = false,
  ...props
}: TaskbarStartButtonProps) => (
  <Button
    {...props}
    aria-label="시작"
    aria-pressed={selected}
    className={clsx("taskbar-start-button", className)}
    data-selected={selected ? "true" : undefined}
    onClick={onAction}
    type="button"
  >
    <img
      alt=""
      aria-hidden="true"
      className="taskbar-start-button__logo"
      draggable={false}
      src={windowsLogoSrc}
    />
  </Button>
);
