import type { ComponentPropsWithRef, CSSProperties, PointerEvent, ReactNode } from "react";

import { clsx } from "clsx";

import type { WindowResizeDirection } from "../chrome/windowResizeHandles";
import { WindowResizeHandles } from "../chrome/windowResizeHandles";

/** WindowFrame이 data-animation으로 노출하는 창 전환 애니메이션 상태. */
export type WindowAnimation = "close" | "minimize" | "none" | "open" | "restore";
/** WindowFrame이 foreground/background 시각 상태를 구분하는 값. */
export type WindowState = "active" | "background";
/** WindowFrame chrome이 파일 창/폴더 창 시각 variant를 구분하는 값. */
export type WindowVariant = "file" | "folder";

/**
 * WindowFrame의 CSS custom property로 변환되는 창 위치/크기 bounds.
 */
export interface WindowFrameBounds {
  /** bottom 기준 배치가 필요할 때 쓰는 px 값. */
  bottom?: number;
  /** 창 높이 px 값. */
  height?: number;
  /** 창 left px 값. */
  left?: number;
  /** right 기준 배치가 필요할 때 쓰는 px 값. */
  right?: number;
  /** 창 top px 값. */
  top?: number;
  /** 창 너비 px 값. */
  width?: number;
}

/** WindowFrame의 시각 상태, bounds, slot 및 위임 callback props. */
export interface WindowFrameProps extends ComponentPropsWithRef<"section"> {
  /** data-animation으로 노출할 창 전환 상태. 기본값은 "none"이다. */
  animation?: WindowAnimation;
  /** CSS custom property로 렌더할 창 배치. */
  bounds?: WindowFrameBounds;
  /** 드래그 중 transition을 끄는 시각 상태. */
  dragging?: boolean;
  /** true이면 창이 taskbar 위 전체 영역을 채운다. */
  fullscreen?: boolean;
  /** resize handle pointer down을 상위 controller에 전달한다. */
  onResizeStart?: (
    event: PointerEvent<HTMLButtonElement>,
    direction: WindowResizeDirection,
  ) => void;
  /** 원본 isOverrideFullScreen: hover preview 안에서 taskbar 높이 없이 100%를 채운다 */
  overrideFullscreen?: boolean;
  /** titleBar 아래에 렌더할 route/address bar slot. */
  routeBar?: ReactNode;
  /** foreground/background 창 시각 상태. 기본값은 "active"이다. */
  state?: WindowState;
  /** header 첫 번째 행에 렌더할 title bar slot. */
  titleBar?: ReactNode;
  /** folder/file chrome variant. 기본값은 "folder"이다. */
  variant?: WindowVariant;
  /** inline style zIndex로 적용할 창 stacking 값. */
  zIndex?: number;
}

const toPx = (value?: number) => (value === undefined ? undefined : `${value}px`);

// bounds를 생략한 순수 visual 사용 예시의 기본 배치.
const DEFAULT_BOUNDS: WindowFrameBounds = { height: 600, left: 120, top: 80, width: 960 };

/**
 * 폴더/파일 창의 render-only 최상위 컨테이너 (원본 SessionControlBar).
 * 계산이 끝난 bounds/dragging/animation 값을 CSS와 data attribute로 표현하고,
 * resize pointer event는 전달받은 callback에 위임한다.
 *
 * @param props.animation data-animation으로 노출할 창 전환 상태. 기본값은 "none"
 * @param props.bounds CSS custom property로 렌더할 창 배치. 기본값은 960×600, left 120, top 80
 * @param props.children 창 body에 렌더할 콘텐츠
 * @param props.className frame root에 추가할 className
 * @param props.dragging true이면 transition을 끄는 시각 상태. 기본값은 false
 * @param props.fullscreen true이면 taskbar 위 영역을 채운다. 기본값은 false
 * @param props.onResizeStart resize handle의 pointer down과 방향을 받을 callback
 * @param props.overrideFullscreen hover preview처럼 taskbar 높이 없이 100%를 채우는 fullscreen variant
 * @param props.routeBar titleBar 아래에 렌더할 route/address bar slot
 * @param props.state foreground/background 시각 상태. 기본값은 "active"
 * @param props.style bounds CSS custom property와 병합할 inline style
 * @param props.titleBar header 첫 번째 행에 렌더할 title bar slot
 * @param props.variant folder/file chrome variant. 기본값은 "folder"
 * @param props.zIndex 창 stacking 값을 inline style로 전달할 값
 */
export const WindowFrame = ({
  animation = "none",
  bounds,
  children,
  className,
  dragging = false,
  fullscreen = false,
  onResizeStart,
  overrideFullscreen = false,
  routeBar,
  state = "active",
  style,
  titleBar,
  variant = "folder",
  zIndex,
  ...props
}: WindowFrameProps) => {
  const resolvedBounds = bounds ?? DEFAULT_BOUNDS;

  return (
    <section
      className={clsx("wb-window-frame", className)}
      data-animation={animation === "none" || overrideFullscreen ? undefined : animation}
      data-dragging={dragging ? "true" : undefined}
      data-fullscreen={fullscreen || overrideFullscreen ? "true" : undefined}
      data-override-fullscreen={overrideFullscreen ? "true" : undefined}
      data-state={state}
      data-variant={variant}
      style={
        {
          "--wb-window-bottom": toPx(resolvedBounds.bottom),
          "--wb-window-height": toPx(resolvedBounds.height),
          "--wb-window-left": toPx(resolvedBounds.left),
          "--wb-window-right": toPx(resolvedBounds.right),
          "--wb-window-top": toPx(resolvedBounds.top),
          "--wb-window-width": toPx(resolvedBounds.width),
          zIndex,
          ...style,
        } as CSSProperties
      }
      {...props}
    >
      <header className="wb-window-frame__header">
        {titleBar}
        {routeBar}
      </header>
      <WindowResizeHandles onResizeStart={onResizeStart} />
      <div className="wb-window-frame__body">{children}</div>
    </section>
  );
};
