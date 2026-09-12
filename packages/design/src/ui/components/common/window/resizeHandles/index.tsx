import type { PointerEvent } from "react";

import type { WindowResizeDirection } from "../../../../../headless/windows/index.js";
import type { WindowFrameMode } from "../frame/index.js";

import "./windowResizeHandles.css";

/** resize handle이 상위 제품 root로 전달하는 pointer callback이다. */
export type WindowResizeStartHandler = (
  event: PointerEvent<HTMLButtonElement>,
  direction: WindowResizeDirection,
) => void;

/** Common Window resize handle의 controlled mode와 callback 입력이다. */
export type WindowResizeHandlesProps = Readonly<{
  /** desktop에서만 handle을 렌더링하도록 현재 제품 mode를 지정한다. */
  mode: WindowFrameMode;
  /** pointer 입력과 정확한 resize 방향을 상위 제품 root로 전달한다. */
  onResizeStart?: WindowResizeStartHandler;
}>;

const WINDOW_RESIZE_DIRECTIONS: readonly WindowResizeDirection[] = [
  "n",
  "s",
  "w",
  "e",
  "nw",
  "ne",
  "sw",
  "se",
];

/**
 * desktop Window frame의 네 edge와 네 corner에 투명 resize hit area를 렌더링한다.
 *
 * bounds 계산과 pointer capture는 소유하지 않으며 시작 event와 방향만 callback으로 전달한다.
 */
export const WindowResizeHandles = ({ mode, onResizeStart }: WindowResizeHandlesProps) =>
  mode === "desktop" ? (
    <>
      {WINDOW_RESIZE_DIRECTIONS.map((direction) => (
        <button
          key={direction}
          aria-hidden="true"
          className="window-resize-handle"
          data-direction={direction}
          onPointerDown={(event) => onResizeStart?.(event, direction)}
          tabIndex={-1}
          type="button"
        />
      ))}
    </>
  ) : null;
