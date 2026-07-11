import type { ComponentProps, ReactNode } from "react";

import { clsx } from "clsx";

import windowsLogoSrc from "../../../../assets/windows.svg";
import { IconButton } from "../../../base/button/iconButton";

export interface TaskbarStartButtonProps extends Omit<
  ComponentProps<typeof IconButton>,
  "icon" | "label" | "size"
> {
  /** Windows logo visual. 기본값은 windows.svg asset이다. */
  icon?: ReactNode;
  /** 접근성 label. 기본값은 "시작"이다. */
  label?: string;
}

const DefaultWindowsLogoIcon = () => (
  <img alt="" aria-hidden="true" draggable={false} src={windowsLogoSrc} />
);

/**
 * Taskbar 시작 버튼의 Windows logo와 selected visual을 렌더링한다.
 * panel 열기/닫기와 portal 연결은 외부 shell connector가 native props로 주입한다.
 *
 * @param props.icon 버튼 안쪽에 표시할 Windows logo. 기본값은 windows.svg
 * @param props.label 접근성 이름. 기본값은 "시작"
 * @param props.selected true이면 열린 시작 패널을 나타내는 selected visual을 표시한다
 * @param props.className 버튼 control에 추가할 className
 */
export const TaskbarStartButton = ({
  className,
  icon = <DefaultWindowsLogoIcon />,
  label = "시작",
  ...props
}: TaskbarStartButtonProps) => (
  <IconButton
    className={clsx("wb-taskbar-start-button", className)}
    icon={icon}
    label={label}
    size="lg"
    {...props}
  />
);
