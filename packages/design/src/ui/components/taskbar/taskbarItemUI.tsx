import type { MouseEventHandler } from "react";

import { clsx } from "clsx";

import { IconButtonUI } from "../../primitives";
import type { TaskbarItemUIProps } from "./taskbarUI.types";

import "./taskbarUI.css";

/**
 * 접근 가능한 이름을 필수로 갖는 40px taskbar item과 실행 indicator를 표현한다.
 *
 * 실제 task 선택, pin, session 식별과 activation 처리는 caller가 ID 없는 `onAction`을 받아 결정한다.
 */
export const TaskbarItemUI = ({
  className,
  icon,
  label,
  onAction,
  onClick,
  state = "idle",
  type = "button",
  ...props
}: TaskbarItemUIProps) => {
  const handleClick: MouseEventHandler<HTMLButtonElement> = (event) => {
    onClick?.(event);

    if (!event.defaultPrevented) {
      onAction?.({ type: "activate" });
    }
  };

  return (
    <IconButtonUI
      {...props}
      className={clsx("wd-taskbar-item-ui", className)}
      data-state={state}
      icon={
        <>
          <span className="wd-taskbar-item-ui__icon">{icon}</span>
          {state === "running" || state === "active" ? (
            <span className="wd-taskbar-item-ui__indicator" />
          ) : null}
        </>
      }
      label={label}
      onClick={handleClick}
      selected={state === "active"}
      size="lg"
      type={type}
    />
  );
};
