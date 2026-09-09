import type { ComponentPropsWithRef, CSSProperties } from "react";

import { clsx } from "clsx";

import "./taskbarPanelSurface.css";

/** Taskbar panel surface가 표현하는 제품별 너비 종류다. */
export type TaskbarPanelSurfaceVariant = "search" | "start";

/** 제품별 너비와 placement가 계산한 가용 높이를 받는 순수 panel surface props다. */
export type TaskbarPanelSurfaceProps = Omit<
  ComponentPropsWithRef<"div">,
  "dangerouslySetInnerHTML"
> &
  Readonly<{
    /** Start와 Search가 공유하는 외형에서 제품별 반응형 너비만 선택한다. */
    variant: TaskbarPanelSurfaceVariant;
    /** placement 계층이 계산한 가용 높이다. 지정하지 않으면 기준 높이 600px을 사용한다. */
    availableHeight?: CSSProperties["height"];
    /** placement 계층이 collision padding을 제외하고 계산한 가용 너비다. */
    availableWidth?: CSSProperties["width"];
  }>;

type TaskbarPanelSurfaceStyle = CSSProperties & {
  "--wd-taskbar-panel-available-height"?: CSSProperties["height"];
  "--wd-taskbar-panel-available-width"?: CSSProperties["width"];
};

/**
 * Start와 Search panel이 공유하는 배경, 테두리, 그림자, 여백과 반응형 크기를 렌더링한다.
 *
 * anchor, portal, open 상태, interaction과 motion lifecycle은 panel 조합 계층이 소유한다.
 */
export const TaskbarPanelSurface = ({
  availableHeight,
  availableWidth,
  className,
  style,
  variant,
  ...props
}: TaskbarPanelSurfaceProps) => {
  const surfaceStyle: TaskbarPanelSurfaceStyle = {
    ...style,
    ...(availableHeight === undefined
      ? {}
      : {
          "--wd-taskbar-panel-available-height":
            typeof availableHeight === "number" ? `${availableHeight}px` : availableHeight,
        }),
    ...(availableWidth === undefined
      ? {}
      : {
          "--wd-taskbar-panel-available-width":
            typeof availableWidth === "number" ? `${availableWidth}px` : availableWidth,
        }),
  };

  return (
    <div
      {...props}
      className={clsx("taskbar-panel-surface", className)}
      data-variant={variant}
      style={surfaceStyle}
    />
  );
};
