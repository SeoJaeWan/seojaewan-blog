import { clsx } from "clsx";

import { useWindowFrameUIInteraction } from "./windowFrameUIContext";
import type { WindowResizeHandlesUIProps, WindowResizeUIDirection } from "./windowUI.types";

const directions: readonly WindowResizeUIDirection[] = ["n", "e", "s", "w", "ne", "se", "sw", "nw"];

/**
 * WindowFrameUI 경계에 4px edge와 8px corner pointer hit area를 배치하는 family-local role이다.
 *
 * 좌표 계산, pointer capture, bounds 저장과 drag lifecycle은 소유하지 않고 시작 방향만 보고한다.
 */
export const WindowResizeHandlesUI = ({
  className,
  disabled = false,
  onResizeStart,
  ...props
}: WindowResizeHandlesUIProps) => {
  const interaction = useWindowFrameUIInteraction();

  return (
    <div
      {...props}
      aria-hidden="true"
      className={clsx("wd-window-resize-handles-ui", className)}
      data-disabled={disabled ? "true" : "false"}
    >
      {directions.map((direction) => (
        <div
          className="wd-window-resize-handles-ui__handle"
          data-direction={direction}
          key={direction}
          onLostPointerCapture={interaction?.onLostPointerCapture}
          onPointerCancel={interaction?.onPointerCancel}
          onPointerDown={
            disabled
              ? undefined
              : (event) => {
                  onResizeStart?.({ direction });
                  interaction?.onResizePointerDown(event, direction);
                }
          }
          onPointerMove={interaction?.onPointerMove}
          onPointerUp={interaction?.onPointerUp}
        />
      ))}
    </div>
  );
};
