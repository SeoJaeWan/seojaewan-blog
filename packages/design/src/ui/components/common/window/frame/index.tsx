import type { ComponentPropsWithRef, CSSProperties, ReactNode } from "react";

import { clsx } from "clsx";

import {
  WindowResizeHandles,
  type WindowResizeStartHandler,
} from "../resizeHandles/index.js";

import "./windowFrame.css";

/** Common Window가 표시할 px 단위 frame 위치와 크기다. */
export type WindowFrameBounds = Readonly<{
  /** usable area의 왼쪽에서 떨어진 거리다. */
  left: number;
  /** usable area의 위쪽에서 떨어진 거리다. */
  top: number;
  /** frame의 border-box 너비다. */
  width: number;
  /** frame의 border-box 높이다. */
  height: number;
}>;

/** Window frame이 따를 현재 responsive 제품 mode다. */
export type WindowFrameMode = "desktop" | "mobile";

/** Window frame이 표현할 application 제품 variant다. */
export type WindowFrameVariant = "chrome" | "file-explorer";

/** Common Window frame의 controlled visual 입력과 content slot이다. */
export type WindowFrameProps = Omit<
  ComponentPropsWithRef<"section">,
  "children" | "dangerouslySetInnerHTML" | "style"
> &
  Readonly<{
    /** WindowStore에서 파생한 active 표현을 지정한다. */
    active: boolean;
    /** desktop normal placement에 사용할 px bounds다. */
    bounds: WindowFrameBounds;
    /** application이 제공하는 고정 row와 scroll content를 렌더링한다. */
    children: ReactNode;
    /** 현재 responsive 제품 mode를 지정한다. */
    mode: WindowFrameMode;
    /** desktop에서 usable area 전체를 채우는 placement를 지정한다. */
    maximized: boolean;
    /** resize handle의 pointer 입력을 상위 제품 root로 전달한다. */
    onResizeStart?: WindowResizeStartHandler;
    /** frame 위쪽에 렌더할 Common titlebar slot이다. */
    titleBar: ReactNode;
    /** header 색상을 선택할 application 제품 variant다. */
    variant: WindowFrameVariant;
    /** WindowStore의 stacking 값을 frame style로 투영한다. */
    zIndex?: number;
  }>;

/** 숫자 bounds를 CSS px 값으로 직렬화한다. */
const toPixelValue = (value: number) => `${value}px`;

/**
 * File Explorer와 Chrome이 함께 쓰는 native Window frame과 content slot을 렌더링한다.
 *
 * Session, active, placement와 stacking은 계산하지 않으며 상위 제품 root의 controlled 값을 표시한다.
 */
export const WindowFrame = ({
  active,
  bounds,
  children,
  className,
  maximized,
  mode,
  onResizeStart,
  titleBar,
  variant,
  zIndex,
  ...props
}: WindowFrameProps) => (
  <section
    {...props}
    className={clsx("window-frame", className)}
    data-active={active ? "true" : "false"}
    data-maximized={maximized ? "true" : "false"}
    data-mode={mode}
    data-variant={variant}
    style={
      {
        "--wd-window-frame-runtime-height": toPixelValue(bounds.height),
        "--wd-window-frame-runtime-left": toPixelValue(bounds.left),
        "--wd-window-frame-runtime-top": toPixelValue(bounds.top),
        "--wd-window-frame-runtime-width": toPixelValue(bounds.width),
        zIndex,
      } as CSSProperties
    }
  >
    {titleBar}
    <WindowResizeHandles mode={mode} onResizeStart={onResizeStart} />
    <div className="window-frame__content">{children}</div>
  </section>
);
