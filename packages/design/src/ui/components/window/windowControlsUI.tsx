import type { PointerEvent } from "react";

import {
  Dismiss16Regular,
  Maximize16Regular,
  SquareMultiple16Regular,
  Subtract16Regular,
} from "@fluentui/react-icons";
import { clsx } from "clsx";

import { IconButtonUI } from "../../primitives/iconButton";
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
 * minimize, maximize/restore와 close를 IconButtonUI로 표현한다.
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
        <IconButtonUI
          className="wd-window-controls-ui__control"
          data-control="minimize"
          disabled={isDisabled("minimize")}
          icon={<Subtract16Regular aria-hidden="true" />}
          label={resolvedLabels.minimize}
          onClick={() => emitControl("minimize")}
        />
      ) : null}
      {showMaximize ? (
        <IconButtonUI
          className="wd-window-controls-ui__control"
          data-control={sizeControl}
          disabled={isDisabled(sizeControl)}
          icon={
            fullscreen ? (
              <SquareMultiple16Regular aria-hidden="true" />
            ) : (
              <Maximize16Regular aria-hidden="true" />
            )
          }
          label={resolvedLabels[sizeControl]}
          onClick={() => emitControl(sizeControl)}
        />
      ) : null}
      {showClose ? (
        <IconButtonUI
          className="wd-window-controls-ui__control wd-window-controls-ui__control--close"
          data-control="close"
          disabled={isDisabled("close")}
          icon={<Dismiss16Regular aria-hidden="true" />}
          label={resolvedLabels.close}
          onClick={() => emitControl("close")}
        />
      ) : null}
    </div>
  );
};
