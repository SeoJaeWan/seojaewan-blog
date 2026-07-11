import type { ComponentProps } from "react";

import { clsx } from "clsx";

import { IconButton } from "../../../base/button/iconButton";

/** taskbar app button indicator가 표시할 실행/비활성 상태. */
export type TaskbarIconButtonState = "active" | "default" | "inactive";

export interface TaskbarIconButtonProps extends Omit<
  ComponentProps<typeof IconButton>,
  "selected" | "size"
> {
  /** true이면 버튼을 disabled 처리하고 dragging visual을 표시한다. 기본값은 false이다. */
  dragging?: boolean;
  /** true이면 selected 배경을 표시한다. 기본값은 false이다. */
  open?: boolean;
  /** 실행 상태 indicator와 selected 여부를 결정한다. 기본값은 "default"이다. */
  state?: TaskbarIconButtonState;
}

/**
 * taskbar의 40px app/start/search icon button shell.
 * IconButton을 감싸 open/active indicator, dragging disabled 상태, taskbar hover 배경을 통일한다.
 *
 * @param props.icon 버튼 안쪽에 표시할 앱/시스템 아이콘
 * @param props.label 접근성 이름
 * @param props.state 실행 상태 indicator와 selected visual을 결정하는 값
 * @param props.open true이면 panel open 상태 배경을 표시한다
 * @param props.dragging true이면 버튼을 비활성화하고 drag visual을 표시한다
 */
export const TaskbarIconButton = ({
  className,
  disabled = false,
  dragging = false,
  open = false,
  state = "default",
  ...props
}: TaskbarIconButtonProps) => (
  <span
    className="wb-taskbar-icon-button"
    data-dragging={dragging ? "true" : undefined}
    data-open={open ? "true" : undefined}
    data-state={state}
  >
    <IconButton
      className={clsx("wb-taskbar-icon-button__control", className)}
      disabled={disabled || dragging}
      selected={open || state === "active"}
      size="lg"
      {...props}
    />
    {state !== "default" && !dragging ? (
      <span aria-hidden="true" className="wb-taskbar-icon-button__indicator" />
    ) : null}
  </span>
);
