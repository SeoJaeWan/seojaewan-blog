import { clsx } from "clsx";

import { useWindowFrameUIInteraction } from "./windowFrameUIContext";
import type { WindowTitleBarUIProps } from "./windowUI.types";

/**
 * title, leading decoration과 controls를 같은 30px native header에 배치한다.
 *
 * 이동이나 fullscreen 전환은 소유하지 않으며 소비자는 native pointer/double-click props를 사용한다.
 */
export const WindowTitleBarUI = ({
  children,
  className,
  controls,
  leading,
  onLostPointerCapture,
  onPointerCancel,
  onPointerDown,
  onPointerMove,
  onPointerUp,
  titleContent,
  ...props
}: WindowTitleBarUIProps) => {
  const interaction = useWindowFrameUIInteraction();

  return (
    <header
      {...props}
      className={clsx("wd-window-title-bar-ui", className)}
      onLostPointerCapture={(event) => {
        onLostPointerCapture?.(event);
        interaction?.onLostPointerCapture(event);
      }}
      onPointerCancel={(event) => {
        onPointerCancel?.(event);
        interaction?.onPointerCancel(event);
      }}
      onPointerDown={(event) => {
        onPointerDown?.(event);
        if (!event.defaultPrevented) interaction?.onMovePointerDown(event);
      }}
      onPointerMove={(event) => {
        onPointerMove?.(event);
        interaction?.onPointerMove(event);
      }}
      onPointerUp={(event) => {
        onPointerUp?.(event);
        interaction?.onPointerUp(event);
      }}
    >
      {leading !== undefined || titleContent !== undefined ? (
        <>
          {leading === undefined ? null : (
            <span aria-hidden="true" className="wd-window-title-bar-ui__leading">
              {leading}
            </span>
          )}
          <div className="wd-window-title-bar-ui__title">{titleContent ?? children}</div>
        </>
      ) : (
        children
      )}
      {controls}
    </header>
  );
};
