import type { CSSProperties } from "react";

import { clsx } from "clsx";

import { WindowResizeHandlesUI } from "./windowResizeHandlesUI";
import type { WindowFrameUIProps } from "./windowUI.types";

import "./windowUI.css";

const toPixelValue = (value: number | undefined) =>
  value === undefined ? undefined : `${value}px`;

/**
 * 계산이 끝난 창 geometry와 visual state를 표현하는 UI-only section이다.
 *
 * 창 lifecycle, stacking, persistence와 animation 완료 뒤 상태 변경은 소비자가 소유한다.
 */
export const WindowFrameUI = ({
  activity = "active",
  bounds,
  children,
  className,
  dragging = false,
  fullscreen = false,
  motion = "idle",
  onResizeStart,
  resizable = false,
  resizeDisabled = false,
  routeBar,
  style,
  titleBar,
  ...props
}: WindowFrameUIProps) => (
  <section
    {...props}
    className={clsx("wd-window-frame-ui", className)}
    data-activity={activity}
    data-dragging={dragging ? "true" : "false"}
    data-fullscreen={fullscreen ? "true" : "false"}
    data-motion={motion}
    data-resizable={resizable ? "true" : "false"}
    style={
      {
        "--wd-window-frame-block-size": toPixelValue(bounds?.blockSize),
        "--wd-window-frame-inline-size": toPixelValue(bounds?.inlineSize),
        "--wd-window-frame-inset-block-start": toPixelValue(bounds?.insetBlockStart),
        "--wd-window-frame-inset-inline-start": toPixelValue(bounds?.insetInlineStart),
        ...style,
      } as CSSProperties
    }
  >
    {titleBar}
    {routeBar}
    <div className="wd-window-frame-ui__body">{children}</div>
    {resizable ? (
      <WindowResizeHandlesUI disabled={resizeDisabled} onResizeStart={onResizeStart} />
    ) : null}
  </section>
);
