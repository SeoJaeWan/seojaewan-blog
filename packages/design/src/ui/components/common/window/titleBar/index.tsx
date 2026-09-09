import type { ComponentPropsWithRef, MouseEvent, PointerEvent, ReactNode } from "react";

import { clsx } from "clsx";

import "./windowTitleBar.css";

/** Common titlebar가 상위 제품 root로 전달하는 move 시작 callback이다. */
export type WindowMoveStartHandler = (event: PointerEvent<HTMLDivElement>) => void;

/** Common titlebar의 application slot과 controlled callback 입력이다. */
export type WindowTitleBarProps = Omit<
  ComponentPropsWithRef<"div">,
  "children" | "dangerouslySetInnerHTML" | "onDoubleClick"
> &
  Readonly<{
    /** application tab strip 또는 현재 title slot이다. */
    children: ReactNode;
    /** 오른쪽 WindowControls slot이다. */
    controls: ReactNode;
    /** 빈 titlebar 영역의 pointer 입력을 move 동작으로 전달한다. */
    onMoveStart?: WindowMoveStartHandler;
    /** 빈 titlebar 영역의 double click을 maximize/restore 동작으로 전달한다. */
    onToggleMaximized?: () => void;
  }>;

const interactiveSelector =
  'a, button, input, select, textarea, [contenteditable="true"], [role="button"], [role="tab"], [data-window-drag-exclude="true"]';

/** titlebar event가 interactive child에서 시작했는지 DOM boundary 안에서 판정한다. */
const isInteractiveTitleBarTarget = (target: EventTarget | null): boolean =>
  target instanceof Element && target.closest(interactiveSelector) !== null;

/**
 * application title slot과 Window controls를 30px Common titlebar에 배치한다.
 *
 * tab 의미와 bounds 변경은 소유하지 않으며 move와 maximize intent만 callback으로 전달한다.
 */
export const WindowTitleBar = ({
  children,
  className,
  controls,
  onMoveStart,
  onToggleMaximized,
  ...props
}: WindowTitleBarProps) => {
  /** interactive child가 아닌 titlebar pointer 입력만 move 시작으로 전달한다. */
  const handlePointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (!isInteractiveTitleBarTarget(event.target)) onMoveStart?.(event);
  };

  /** interactive child가 아닌 titlebar double click만 maximize toggle로 전달한다. */
  const handleDoubleClick = (event: MouseEvent<HTMLDivElement>) => {
    if (!isInteractiveTitleBarTarget(event.target)) onToggleMaximized?.();
  };

  return (
    <div {...props} className={clsx("window-title-bar", className)}>
      <div
        className="window-title-bar__drag-region"
        data-window-drag-region="true"
        onDoubleClick={handleDoubleClick}
        onPointerDown={handlePointerDown}
      >
        {children}
      </div>
      {controls}
    </div>
  );
};
