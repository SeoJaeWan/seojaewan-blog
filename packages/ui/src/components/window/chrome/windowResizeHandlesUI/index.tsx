import type { PointerEvent } from "react";

/** WindowResizeHandlesUI가 전달하는 8방향 resize handle 식별자. */
export type WindowResizeDirection = "e" | "n" | "ne" | "nw" | "s" | "se" | "sw" | "w";

export interface WindowResizeHandlesUIProps {
  /** handle pointerdown 시 원본 event와 resize 방향을 상위 controller에 전달한다. */
  onResizeStart?: (
    event: PointerEvent<HTMLButtonElement>,
    direction: WindowResizeDirection,
  ) => void;
}

const DIRECTIONS: WindowResizeDirection[] = ["n", "s", "w", "e", "nw", "ne", "sw", "se"];

/**
 * 창 가장자리 리사이즈 히트 영역 (원본 4변 h-1/w-1 + 4모서리 w-2 h-2 버튼).
 * WindowFrameUI의 시각 chrome을 건드리지 않도록 투명 button만 렌더링하고,
 * pointer down 시 어느 방향 resize인지 상위 bounds controller에 위임한다.
 *
 * @param props.onResizeStart handle pointerdown event와 resize 방향을 받는 callback
 */
export const WindowResizeHandlesUI = ({ onResizeStart }: WindowResizeHandlesUIProps) => (
  <>
    {DIRECTIONS.map((direction) => (
      <button
        key={direction}
        aria-hidden="true"
        className="wb-window-resize-handle"
        data-direction={direction}
        onPointerDown={(event) => onResizeStart?.(event, direction)}
        tabIndex={-1}
        type="button"
      />
    ))}
  </>
);
