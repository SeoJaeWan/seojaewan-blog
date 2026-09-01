import type { PointerEvent } from "react";

import {
  Dismiss16Regular,
  Maximize16Regular,
  SquareMultiple16Regular,
  Subtract16Regular,
} from "@fluentui/react-icons";
import { clsx } from "clsx";

import type {
  WindowControlsUIProps,
  WindowControlUIAction,
  WindowControlUILabels,
} from "./windowUI.types";

const defaultLabels: WindowControlUILabels = {
  close: "닫기",
  maximize: "최대화",
  minimize: "최소화",
  restore: "이전 크기로 복원",
};

/**
 * minimize, maximize/restore와 close를 icon-only native buttons로 표현한다.
 *
 * 모든 activation은 ID-free `{ control }` payload 하나로 보고하며 실제 창 동작은 수행하지 않는다.
 */
export const WindowControlsUI = ({
  className,
  disabled = false,
  disabledControls = [],
  fullscreen = false,
  labels,
  onControl,
  onPointerDown,
  showClose = true,
  showMaximize = true,
  showMinimize = true,
  ...props
}: WindowControlsUIProps) => {
  const resolvedLabels = { ...defaultLabels, ...labels };
  const sizeControl: WindowControlUIAction = fullscreen ? "restore" : "maximize";
  const isDisabled = (control: WindowControlUIAction) =>
    disabled || disabledControls.includes(control);
  const emitControl = (control: WindowControlUIAction) => onControl?.({ control });
  const handlePointerDown = (event: PointerEvent<HTMLDivElement>) => {
    event.stopPropagation();
    onPointerDown?.(event);
  };

  return (
    <div
      {...props}
      className={clsx("wd-window-controls-ui", className)}
      data-disabled={disabled ? "true" : "false"}
      onPointerDown={handlePointerDown}
    >
      {showMinimize ? (
        <button
          aria-label={resolvedLabels.minimize}
          className="wd-window-controls-ui__control"
          data-control="minimize"
          disabled={isDisabled("minimize")}
          onClick={() => emitControl("minimize")}
          type="button"
        >
          <Subtract16Regular aria-hidden="true" />
        </button>
      ) : null}
      {showMaximize ? (
        <button
          aria-label={resolvedLabels[sizeControl]}
          className="wd-window-controls-ui__control"
          data-control={sizeControl}
          disabled={isDisabled(sizeControl)}
          onClick={() => emitControl(sizeControl)}
          type="button"
        >
          {fullscreen ? (
            <SquareMultiple16Regular aria-hidden="true" />
          ) : (
            <Maximize16Regular aria-hidden="true" />
          )}
        </button>
      ) : null}
      {showClose ? (
        <button
          aria-label={resolvedLabels.close}
          className="wd-window-controls-ui__control wd-window-controls-ui__control--close"
          data-control="close"
          disabled={isDisabled("close")}
          onClick={() => emitControl("close")}
          type="button"
        >
          <Dismiss16Regular aria-hidden="true" />
        </button>
      ) : null}
    </div>
  );
};
