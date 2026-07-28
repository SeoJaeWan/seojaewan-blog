import type { ComponentPropsWithoutRef, PointerEvent, ReactNode } from "react";

import { clsx } from "clsx";

/** WindowTitleBarUI의 visual slot과 상위 controller 위임 callback props. */
export interface WindowTitleBarUIProps extends ComponentPropsWithoutRef<"div"> {
  /** 우측 창 제어 버튼 slot. 보통 WindowControlsUI를 전달한다. */
  controls?: ReactNode;
  /** 제목 영역 pointer down을 상위 controller에 전달한다. */
  onMoveStart?: (event: PointerEvent<HTMLDivElement>) => void;
  /** 행 더블클릭 — fullscreen 토글 */
  onToggleFullscreen?: () => void;
}

/**
 * 30px 타이틀 행 (원본 SessionControlBar header 첫 번째 행).
 * 왼쪽 title/tab 영역과 오른쪽 window controls를 같은 drag-safe 행에 배치한다.
 * 창 이동 계산은 하지 않고 pointer down을 onMoveStart에 위임한다.
 *
 * @param props.children 왼쪽 title/tab 영역에 렌더할 콘텐츠
 * @param props.controls 우측 창 제어 버튼 slot. 보통 WindowControlsUI를 전달한다
 * @param props.onMoveStart 제목 영역 pointer down을 받을 drag controller callback
 * @param props.onToggleFullscreen 행 더블클릭 시 fullscreen toggle을 위임하는 callback
 * @param props.className title bar root에 추가할 className
 */
export const WindowTitleBarUI = ({
  children,
  className,
  controls,
  onMoveStart,
  onToggleFullscreen,
  ...props
}: WindowTitleBarUIProps) => (
  <div
    className={clsx("wb-window-title-bar", className)}
    onDoubleClick={onToggleFullscreen}
    {...props}
  >
    <div className="wb-window-title-bar__drag" onPointerDown={onMoveStart}>
      {children}
    </div>
    {controls}
  </div>
);
