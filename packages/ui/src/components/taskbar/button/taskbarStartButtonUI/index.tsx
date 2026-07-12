import type { ComponentProps, ReactNode } from "react";

import { clsx } from "clsx";

import windowsLogoSrc from "../../../../assets/windows.svg";
import { IconButton } from "../../../base/button/iconButton";

export interface TaskbarStartButtonUIProps extends Omit<
  ComponentProps<typeof IconButton>,
  "aria-label" | "icon" | "size"
> {
  /** 접근성 이름. 기본값은 "시작"이다. */
  "aria-label"?: string;
  /** Windows logo visual. 기본값은 windows.svg asset이다. */
  icon?: ReactNode;
}

const DefaultWindowsLogoIcon = () => (
  <img alt="" aria-hidden="true" draggable={false} src={windowsLogoSrc} />
);

/**
 * Taskbar 시작 버튼의 Windows logo와 selected visual을 렌더링한다.
 * panel 열기/닫기와 portal 연결은 외부 shell connector가 native props로 주입한다.
 *
 * @param props.aria-label 접근성 이름. 기본값은 "시작"
 * @param props.icon 버튼 안쪽에 표시할 Windows logo. 기본값은 windows.svg
 * @param props.selected true이면 열린 시작 패널을 나타내는 selected visual을 표시한다
 * @param props.className 버튼 control에 추가할 className
 */
export const TaskbarStartButtonUI = ({
  "aria-label": ariaLabel = "시작",
  className,
  icon = <DefaultWindowsLogoIcon />,
  ...props
}: TaskbarStartButtonUIProps) => (
  <IconButton
    className={clsx("wb-taskbar-start-button", className)}
    icon={icon}
    aria-label={ariaLabel}
    size="lg"
    {...props}
  />
);
